const fs = require('fs');
const file = '/Users/rishu/code/Assitrio/Assitrio/src/components/overlays/NoteDetail.jsx';
let content = fs.readFileSync(file, 'utf8');

const shareFormatStart = content.indexOf('  const formatShareText = () => {');
const shareFormatEnd = content.indexOf('  const handleShareWhatsApp = () => {');

const newFormat = `  const formatShareText = () => {
    let text = \`\${note.title}\\nDate: \${note.date} | Duration: \${note.duration} | Time: \${note.time}\\n\\n\`;
    if (note.summaryDetailed || note.summaryShort || note.summary) text += \`Executive Summary\\n\${note.summaryDetailed || note.summaryShort || note.summary}\\n\\n\`;
    if (note.mom) text += \`Minutes of Meeting\\n\${note.mom}\\n\\n\`;
    if (note.tasks?.length > 0) {
      text += \`Tasks (\${completedCount}/\${totalCount})\\n\`;
      note.tasks.forEach(t => { text += \`- \${t.done ? '[x]' : '[ ]'} \${t.text}\${t.date ? \` (Due: \${t.date})\` : ''}\\n\`; });
      text += '\\n';
    }
    const noteIdStr = String(note.id); let hash = 0;
    for (let i = 0; i < noteIdStr.length; i++) { hash = ((hash << 5) - hash) + noteIdStr.charCodeAt(i); hash |= 0; }
    const accessCode = Math.abs(hash).toString().substring(0, 6).padStart(6, '0');
    const shareId = noteIdStr.split('-')[0] || noteIdStr.substring(0, 8);
    text += \`Secure Recording Access\\nLink: https://app.assistrio.com/recording/\${shareId}\\nAccess Code: \${accessCode}\\n\\n— Shared via Assistrio\`;
    return text;
  };

`;

content = content.substring(0, shareFormatStart) + newFormat + content.substring(shareFormatEnd);

const transcriptStart = content.indexOf('            {/* Transcript */}');
const deleteNoteStr = '            {deleteNote && (';
const transcriptEnd = content.indexOf(deleteNoteStr);

const newTranscript = `            {/* Transcript */}
            <div style={{ ...dk.card, padding: 0, overflow: 'hidden' }}>
              <div style={{...dk.transcriptToggle, cursor: 'default'}}>
                <p style={dk.cardLabel()}><FileText size={15} />Extended Transcript {note.diarization?.length > 0 && <span style={{ fontSize: 8, fontWeight: 800, backgroundColor: 'rgba(52,211,153,0.1)', color: '#34d399', padding: '2px 7px', borderRadius: 6, marginLeft: 6 }}>DIARIZED</span>}</p>
              </div>
              <div style={dk.transcriptBody}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  <button onClick={togglePlayback} style={dk.playBtn(isPlaying)}>{isPlaying ? 'Stop Playback' : 'Listen to Recording'}</button>
                </div>
                <div style={dk.transcriptBox}>
                  {note.diarization?.length > 0 ? note.diarization.map((line, i) => (
                    <div key={i} style={line.includes('Speaker 2') ? dk.diaryLine2 : dk.diaryLine1}>{line}</div>
                  )) : <p style={{ whiteSpace: 'pre-line', lineHeight: 1.7, margin: 0 }}>{note.transcript}</p>}
                </div>
              </div>
            </div>

`;

content = content.substring(0, transcriptStart) + newTranscript + content.substring(transcriptEnd);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed NoteDetail.jsx!');
