const { Groq } = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function getAIResponse(messages) {
    try {
        const completion = await groq.chat.completions.create({
            messages: messages,
            model: 'openai/gpt-oss-20b',
        });
        return completion.choices[0]?.message?.content || 'Maaf, tidak ada respons.';
    } catch (error) {
        console.error('Error Groq AI:', error);
        return 'Terjadi gangguan pada sistem AI.';
    }
}

module.exports = { getAIResponse };
