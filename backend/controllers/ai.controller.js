const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const upload = multer();
const Config = require('../models/Config');
const User = require('../models/User');
const { AccessToken } = require('livekit-server-sdk');

// Base URLs - they should have placeholders for deployment name
const BASE_PROJECT_RESPONSE_URL = 'https://triotechcode.services.ai.azure.com/api/projects/triotechcode/openai/v1/responses';
const BASE_AZURE_REALTIME_URL = 'https://triotechcode.cognitiveservices.azure.com/openai/deployments/';

/**
 * Helper to get user's assigned models from config
 */
async function getModelsForUser(userId) {
  try {
    const defaultModels = { aiModel: 'gpt-5.4-nano', realtimeModel: 'gpt-realtime-1.5' };
    if (!userId) return defaultModels;
    const user = await User.findById(userId);
    const config = await Config.findOne({ key: 'global' });

    if (!user || !config) return defaultModels;

    const planConfig = config.plans.find(p => p.name === (user.plan || 'Free'));
    return planConfig || defaultModels;
  } catch (e) {
    return { aiModel: 'gpt-5.4-nano', realtimeModel: 'gpt-realtime-1.5' };
  }
}

function toResponsesContentParts(content) {
  if (typeof content === 'string') {
    const text = content.trim();
    return text ? [{ type: 'input_text', text }] : [];
  }

  if (Array.isArray(content)) {
    const parts = [];
    for (const p of content) {
      if (!p) continue;

      if (typeof p === 'string') {
        const text = p.trim();
        if (text) parts.push({ type: 'input_text', text });
        continue;
      }

      if (p.type === 'input_audio' && p.input_audio?.data) {
        parts.push({
          type: 'input_audio',
          input_audio: {
            data: p.input_audio.data,
            format: p.input_audio.format || 'wav'
          }
        });
        continue;
      }

      if ((p.type === 'text' || p.type === 'input_text') && typeof p.text === 'string') {
        const text = p.text.trim();
        if (text) parts.push({ type: 'input_text', text });
        continue;
      }

      if (typeof p.text === 'string') {
        const text = p.text.trim();
        if (text) parts.push({ type: 'input_text', text });
      }
    }
    return parts;
  }

  return [];
}

function toResponsesInputFromChatMessages(chatMessages) {
  if (!Array.isArray(chatMessages)) return [];
  return chatMessages
    .map((m) => {
      const role = m?.role;
      const content = toResponsesContentParts(m?.content);
      if (!role || content.length === 0) return null;
      return { type: 'message', role, content };
    })
    .filter(Boolean);
}

function resolveApiKey(providedKey, envVarName) {
  const fromBody = typeof providedKey === 'string' ? providedKey.trim() : '';
  if (fromBody) return fromBody;
  const fromEnv = typeof process.env[envVarName] === 'string' ? process.env[envVarName].trim() : '';
  return fromEnv || null;
}

exports.getChatResponse = async (req, res) => {
  try {
    const { systemPrompt, messages, userMessage, key } = req.body;
    const apiKey = resolveApiKey(key, 'AZURE_OPENAI_KEY');
    if (!apiKey) {
      res.status(500).json({ error: 'Missing AZURE_OPENAI_KEY' });
      return;
    }
    const models = await getModelsForUser(req.user?.id);
    const deploymentName = models.aiModel;

    const chatMessages = Array.isArray(messages) && messages.length > 0
      ? messages
      : [
        { role: 'system', content: systemPrompt || '' },
        { role: 'user', content: userMessage || '' }
      ];

    const url = BASE_PROJECT_RESPONSE_URL;
    const input = toResponsesInputFromChatMessages(chatMessages);
    if (input.length === 0) {
      res.status(400).json({ error: 'Missing or empty chat input' });
      return;
    }

    const response = await axios.post(url, {
      input,
      model: deploymentName
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}` // Project-level endpoints often use Bearer token
      }
    });

    res.json(response.data);
  } catch (err) {
    console.error('Azure Chat Error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
  }
};

exports.getRealtimeResponse = async (req, res) => {
  try {
    const { systemPrompt, userMessage, audioBase64, requestAudio, messageHistory, key } = req.body;
    const apiKey = resolveApiKey(key, 'AZURE_REALTIME_KEY');
    if (!apiKey) {
      res.status(500).json({ error: 'Missing AZURE_REALTIME_KEY' });
      return;
    }
    const models = await getModelsForUser(req.user?.id);
    const deploymentName = models.realtimeModel;

    let userContent;
    if (audioBase64) {
      userContent = [
        { type: 'text', text: userMessage || 'Please transcribe this.' },
        { type: 'input_audio', input_audio: { data: audioBase64, format: 'wav' } }
      ];
    } else {
      userContent = userMessage;
    }

    const messages = [{ role: 'system', content: systemPrompt || '' }];

    if (messageHistory && Array.isArray(messageHistory)) {
      messages.push(...messageHistory);
    }

    if (userContent) {
      messages.push({ role: 'user', content: userContent });
    }

    const payload = { messages };

    if (requestAudio) {
      payload.modalities = ["text", "audio"];
      payload.audio = { voice: "alloy", format: "wav" };
    }

    const url = `${BASE_AZURE_REALTIME_URL}${deploymentName}/chat/completions?api-version=2024-10-01-preview`;

    const response = await axios.post(url, payload, {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    res.json(response.data);
  } catch (err) {
    console.error('Azure Realtime Error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
  }
};

exports.processSTT = async (req, res) => {
  try {
    const apiKey = resolveApiKey(undefined, 'AZURE_OPENAI_KEY');
    if (!apiKey) {
      res.status(500).json({ error: 'Missing AZURE_OPENAI_KEY' });
      return;
    }
    const formData = new FormData();
    formData.append('audio', req.file.buffer, {
      filename: 'recording.wav',
      contentType: 'audio/wav'
    });

    if (req.body.definition) {
      formData.append('definition', req.body.definition);
    }

    const response = await axios.post('https://triotechcode.cognitiveservices.azure.com/speechtotext/transcriptions:transcribe?api-version=2025-10-15', formData, {
      headers: {
        ...formData.getHeaders(),
        'Ocp-Apim-Subscription-Key': apiKey
      }
    });

    res.json(response.data);
  } catch (err) {
    console.error('STT API Error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
  }
};

exports.getLivekitToken = async (req, res) => {
  try {
    const botEnabled = String(process.env.LIVEKIT_BOT_ENABLED || '').toLowerCase() === 'true';
    if (!botEnabled) {
      res.json({ enabled: false });
      return;
    }

    const livekitUrl = typeof process.env.LIVEKIT_URL === 'string' ? process.env.LIVEKIT_URL.trim() : '';
    const apiKey = typeof process.env.LIVEKIT_API_KEY === 'string' ? process.env.LIVEKIT_API_KEY.trim() : '';
    const apiSecret = typeof process.env.LIVEKIT_API_SECRET === 'string' ? process.env.LIVEKIT_API_SECRET.trim() : '';

    if (!livekitUrl || !apiKey || !apiSecret) {
      res.status(500).json({ error: 'Missing LiveKit server configuration (LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)' });
      return;
    }

    const requestedRoomName = typeof req.body?.roomName === 'string' ? req.body.roomName.trim() : '';
    const userId = req.user?.id ? String(req.user.id) : 'anon';
    const roomName = requestedRoomName || `talk-${userId}-${Date.now()}`;
    const identity = req.user?.id ? `user-${userId}` : `anon-${Date.now()}`;

    const token = new AccessToken(apiKey, apiSecret, {
      identity,
      name: req.user?.username ? String(req.user.username) : 'User',
      ttl: 60 * 60
    });

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    });

    const jwt = await token.toJwt();
    res.json({
      enabled: true,
      url: livekitUrl,
      roomName,
      token: jwt
    });
  } catch (err) {
    console.error('LiveKit token error:', err.message);
    res.status(500).json({ error: 'Failed to create LiveKit token' });
  }
};
