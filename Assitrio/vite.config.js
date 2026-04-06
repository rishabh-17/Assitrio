import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import {
  AZURE_FOUNDRY_RESPONSES_URL,
  AZURE_PRIMARY_MODEL,
  firstNonEmptyKey,
  openAiMessagesToFoundryInput,
} from './src/config/azureFoundry.js'

/**
 * Dev-only: Vite's http-proxy pipes the original POST body while we also rewrite the body,
 * which corrupts the upstream request and often yields 401/400 from Azure. Forward with fetch instead.
 */
function azureFoundryOpenAiDevPlugin() {
  return {
    name: 'azure-foundry-openai-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split('?')[0] ?? ''
        if (pathname !== '/api/azure-openai' || req.method !== 'POST') {
          return next()
        }

        const env = loadEnv(server.config.mode, process.cwd(), '')

        try {
          const chunks = []
          for await (const chunk of req) {
            chunks.push(chunk)
          }
          const raw = Buffer.concat(chunks).toString('utf8')
          const parsed = JSON.parse(raw)

          // Client bundle key first so a bad .env line cannot override a working embedded key
          const apiKey = firstNonEmptyKey(
            parsed.key,
            env.AZURE_OPENAI_KEY,
            env.VITE_AZURE_OPENAI_KEY
          )

          if (!apiKey) {
            res.statusCode = 401
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(
              JSON.stringify({
                error: { message: 'Missing Azure API key (set AZURE_OPENAI_KEY in .env or VITE_AZURE_OPENAI_KEY).' },
              })
            )
            return
          }

          const messages = parsed.messages || [
            { role: 'system', content: parsed.systemPrompt },
            { role: 'user', content: parsed.userMessage },
          ]

          const foundryBody = JSON.stringify({
            model: AZURE_PRIMARY_MODEL,
            input: openAiMessagesToFoundryInput(messages),
          })

          const upstream = await fetch(AZURE_FOUNDRY_RESPONSES_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': apiKey,
              'Ocp-Apim-Subscription-Key': apiKey,
            },
            body: foundryBody,
          })

          const text = await upstream.text()
          res.statusCode = upstream.status
          const ct = upstream.headers.get('content-type')
          res.setHeader('Content-Type', ct || 'application/json; charset=utf-8')
          res.end(text)
        } catch (e) {
          console.error('[azure-foundry-openai]', e)
          if (!res.headersSent) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ error: { message: e?.message || 'Proxy error' } }))
          }
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
  plugins: [azureFoundryOpenAiDevPlugin(), react()],
  server: {
    proxy: {
      '/api/azure-realtime': {
        target: 'https://xeny-resource.cognitiveservices.azure.com',
        changeOrigin: true,
        rewrite: () => '/openai/deployments/gpt-realtime-1.5/chat/completions?api-version=2024-10-01-preview',
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body);
                const apiKey = firstNonEmptyKey(
                  parsed.key,
                  env.AZURE_REALTIME_KEY,
                  env.VITE_AZURE_REALTIME_KEY
                );

                let userContent;
                if (parsed.audioBase64) {
                  userContent = [
                    { type: 'text', text: parsed.userMessage || 'Please transcribe this.' },
                    { type: 'input_audio', input_audio: { data: parsed.audioBase64, format: 'wav' } }
                  ];
                } else {
                  userContent = parsed.userMessage;
                }

                const azureBodyStruct = {
                  messages: [
                    { role: 'system', content: parsed.systemPrompt }
                  ]
                };

                // Push message history if provided, otherwise just the current turn
                if (parsed.messageHistory && Array.isArray(parsed.messageHistory)) {
                  azureBodyStruct.messages.push(...parsed.messageHistory);
                }
                
                // Add the new user turn
                if (userContent) {
                  azureBodyStruct.messages.push({ role: 'user', content: userContent });
                }

                // Append audio modalities if requested for Talk mode
                if (parsed.requestAudio) {
                  azureBodyStruct.modalities = ["text", "audio"];
                  azureBodyStruct.audio = {
                    voice: "alloy",
                    format: "wav"
                  };
                }

                const azureBody = JSON.stringify(azureBodyStruct);
                proxyReq.setHeader('api-key', apiKey);
                proxyReq.setHeader('Content-Type', 'application/json');
                proxyReq.setHeader('Content-Length', Buffer.byteLength(azureBody));
                proxyReq.write(azureBody);
                proxyReq.end();
              } catch (e) {
                console.error('Proxy error:', e);
              }
            });
          });
        }
      },
      '/api/azure-stt': {
        target: 'https://triotechcode.cognitiveservices.azure.com',
        changeOrigin: true,
        rewrite: () => '/speechtotext/transcriptions:transcribe?api-version=2025-10-15',
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Forward natively without reading body so multipart doesn't break
          });
        }
      }
    }
  }
  }
})
