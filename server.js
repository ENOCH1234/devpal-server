import express, { response } from "express";
import * as dotenv from "dotenv";
import cors from "cors";
import { Configuration, OpenAIApi } from "openai";
import WhatsappCloudAPI from "whatsappcloudapi_wrapper";
import Tesseract from "tesseract.js";
import axios from "axios";

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

const getImageURL = async (image) => {
  await fetch(`https://graph.facebook.com/v16.0/${image.id}/`, {
    headers: {
      Authorization:
        "Bearer EAAKr5SglLwoBACEv8SZAm6Be9KVCogFqZCePHAuYZBgeoOXige6Y9ezZAXxRwP18ZBPDdnZCiEEqSAXDZC4sDp6hMmYCckm7GjnYSyh7pNclsw9KaGgu1UpR5deS9XkE1OAwJaHTlQG45qee43I27HPeNGZArJGaRqVapMz5bAmFxZBAYMxn3lbjJykYFBjC66k7FM87ZA7WjFYAZDZD",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      return data;
    })
    .catch((error) => console.log(error));
};

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
      "EAAKr5SglLwoBACEv8SZAm6Be9KVCogFqZCePHAuYZBgeoOXige6Y9ezZAXxRwP18ZBPDdnZCiEEqSAXDZC4sDp6hMmYCckm7GjnYSyh7pNclsw9KaGgu1UpR5deS9XkE1OAwJaHTlQG45qee43I27HPeNGZArJGaRqVapMz5bAmFxZBAYMxn3lbjJykYFBjC66k7FM87ZA7WjFYAZDZD",
    senderPhoneNumberId: 109143592105426,
    WABA_ID: body.entry[0].id,
    graphAPIVersion: "v16.0",
  });

  switch (message.type) {
    case "text":
      try {
        const prompt = message.text.body;
        const response = await openai.createCompletion({
          model: "text-davinci-003",
          prompt: `${prompt}`,
          temperature: 1,
          max_tokens: 3000,
          top_p: 1,
          frequency_penalty: 0.5,
          presence_penalty: 0,
        });

        await WhatsApp.sendText({
          message: response.data.choices[0].text,
          recipientPhone: sender.wa_id,
        })
          .then((result) => {
            console.log(result);
          })
          .catch((error) => {
            console.error(error);
          });
      } catch (error) {
        res.status(500).send({ error });
      }
      break;

    case "audio":
      console.log("An audio message received.");
      break;

    case "image":
      const imageLink = await getImageURL(message.image);

      const realImage = await axios(imageLink.url, {
        headers: {
          Authorization:
            "Bearer EAAKr5SglLwoBACEv8SZAm6Be9KVCogFqZCePHAuYZBgeoOXige6Y9ezZAXxRwP18ZBPDdnZCiEEqSAXDZC4sDp6hMmYCckm7GjnYSyh7pNclsw9KaGgu1UpR5deS9XkE1OAwJaHTlQG45qee43I27HPeNGZArJGaRqVapMz5bAmFxZBAYMxn3lbjJykYFBjC66k7FM87ZA7WjFYAZDZD",
        },
      });

      const getText = await Tesseract.recognize(realImage, "eng", {
        logger: (m) => console.log(m),
      }).then(({ data: { text } }) => {
        return text;
      });

      await WhatsApp.sendText({
        message: getText,
        recipientPhone: sender.wa_id,
      })
        .then((result) => {
          console.log(result);
        })
        .catch((error) => {
          console.error(error);
        });

      break;

    default:
      console.log("Nothing received.");
  }
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
