import express from "express";
import * as dotenv from "dotenv";
import cors from "cors";
import { Configuration, OpenAIApi } from "openai";

const { WhatsApp } = require("facebook-nodejs-business-sdk");
const client = new WhatsApp({
  accessToken: "THEFACE",
});

dotenv.config();

const configuration = new Configuration({
  //   apiKey: process.env.OPENAI_API_KEY
  apiKey: "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",
});

const openai = new OpenAIApi(configuration);

const app = express();
app.use(
  cors({
    origin: "https://devspal.web.app",
  })
);
app.use(express.json());

app.get("/", async (req, res) => {
  res.status(200).send({
    message: "Hello from DevsPal",
  });
});

app.post("/webhooks", (req, res) => {
  console.log(req.body);

  const body = req.body;
  const entry = body.entry;
  console.log(entry);
  if (body.field !== "messages") {
    // not from the messages webhook so dont process
    return res.sendStatus(400);
  }
  // const message = body.messages.text.body;
  // console.log(message);

  // Your code to handle the incoming message goes here
  // const message = req.body.message;
  // const senderId = message.sender.id;

  // Send a text message back to the user
  client
    .sendMessage(senderId, {
      text: "Hello, World!",
    })
    .then((result) => {
      console.log(result);
    })
    .catch((error) => {
      console.error(error);
    });
});

app.post("/webhook", (req, res) => {
  if (
    req.query["hub.mode"] == "subscribe" &&
    req.query["hub.verify_token"] == "THEFACE"
  ) {
    res.send(req.query["hub.challenge"]);
  } else {
    console.log("not recognized");
    res.sendStatus(400);
  }
});

app.post("/all", async (req, res) => {
  try {
    const prompt = req.body.prompt;
    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: `${prompt}`,
      temperature: 1,
      max_tokens: 3000,
      top_p: 1,
      frequency_penalty: 0.5,
      presence_penalty: 0,
    });

    res.status(200).send({
      bot: response.data.choices[0].text,
    });
  } catch (error) {
    res.status(500).send({ error });
  }
});

app.listen(5000, () =>
  console.log("Server is running on port http://localhost:5000")
);
