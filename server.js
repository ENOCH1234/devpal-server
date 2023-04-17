import express from "express";
import * as dotenv from "dotenv";
import cors from "cors";
import { Configuration, OpenAIApi } from "openai";
import WhatsappCloudAPI from "whatsappcloudapi_wrapper";

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

app.post("/webhooks", async (req, res) => {
  const body = req.body;
  const values = body.entry[0].changes[0].value;
  const sender = values.contacts[0];
  const message = values.messages[0];

  console.log("See", body.entry[0].id);
  console.log(sender);
  console.log(message);

  if (body.entry[0].changes[0].field !== "messages") {
    // not from the messages webhook so dont process
    return res.sendStatus(400);
  }

  const WhatsApp = new WhatsappCloudAPI({
    accessToken:
      "EAAKr5SglLwoBABgfLORmEUV1DRELrKXUNEWXihRwMDKb0edwvX09YnUAK9euGJjG36CwGRtYpYeQlxUAnSZCsxYZCps6SZCnruOLMltqdDZB33kl9cDvcsosflSD4MzKU8APjNaaAFrfIQtNVH1KSfkdh4IwUpP6ZC5wmQ7dDqGNtoaZAgXCwG9muU0r6KR0tEhOhpk5C7qgZDZD",
    senderPhoneNumberId: 109143592105426,
    WABA_ID: body.entry[0].id,
    graphAPIVersion: "v16.0",
  });

  switch (message.type) {
    case "text":
      console.log("A text message received.");
      break;

    case "audio":
      console.log("An audio message received.");
      break;

    case "image":
      console.log("An image received");
  }

  await WhatsApp.sendSimpleButtons({
    message: `Hey *${sender.profile.name}*, your phone number *${sender.wa_id}* has been stored in our database. This message demonstrates your ability to communicate with this bot. A customized response will be put in place soon. \n\n *Love, ZeekCodes*.`,
    recipientPhone: sender.wa_id,
    listOfButtons: [
      {
        title: "Chat The Face",
        id: "see_categories",
      },
      {
        title: "Call ZeekCodes",
        id: "speak_to_human",
      },
    ],
  })

    .then((result) => {
      console.log(result);
    })
    .catch((error) => {
      console.error(error);
    });

  // Your code to handle the incoming message goes here
  // const senderId = sender.wa_id;
  // Send a text message back to the user
  //   client
  //     .sendMessage(senderId, {
  //       text: "Hello, World!",
  //     })
  // .then((result) => {
  //   console.log(result);
  // })
  // .catch((error) => {
  //   console.error(error);
  // });
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
