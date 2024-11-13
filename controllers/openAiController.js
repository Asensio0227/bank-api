const axios = require('axios');
// '/ask'
const askAi = async (req, res) => {
  const userQuestion = req.body.question;

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: userQuestion }],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  res.json({ answer: response.data.choices[0].message.content });
};

module.exports = askAi;
