import express, { response } from "express";
import * as dotenv from "dotenv";
import cors from "cors";
import { Configuration, OpenAIApi } from "openai";
import WhatsappCloudAPI from "whatsappcloudapi_wrapper";
import Tesseract from "tesseract.js";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";

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
  let config = {
    method: "get",
    maxBodyLength: Infinity,
    url: `https://graph.facebook.com/v16.0/${image.id}/`,
    headers: {
      Authorization:
        "Bearer EAAKr5SglLwoBAG9XyMniyL7SAtk4XnsB9tZASIhSHWkC8AXAY4D92KkGqATRUhrPq9Jef7MbuGAHFBlMYaPcdUZBnTJuZAl2ZBxobXcNSBxLp9k31PNaj5mqduCQGOJUON14cVtGfvZAxbDyIZBIZCgjX71hxzyth9GSIDe6bi20ehx7DtDXApfsI6mYU8IDqKrFSpRAltw1AZDZD",
    },
  };
  const response = await axios.request(config);
  const getImageNow = await getImage(response.data.url);
  return getImageNow;
};

const getImage = async (link) => {
  let config = {
    method: "get",
    maxBodyLength: Infinity,
    url: `${link}`,
    headers: {
      Authorization:
        "Bearer EAAKr5SglLwoBAG9XyMniyL7SAtk4XnsB9tZASIhSHWkC8AXAY4D92KkGqATRUhrPq9Jef7MbuGAHFBlMYaPcdUZBnTJuZAl2ZBxobXcNSBxLp9k31PNaj5mqduCQGOJUON14cVtGfvZAxbDyIZBIZCgjX71hxzyth9GSIDe6bi20ehx7DtDXApfsI6mYU8IDqKrFSpRAltw1AZDZD",
    },
    responseType: "arraybuffer",
  };

  const response = await axios.request(config);
  const buffer = Buffer.from(response.data);
  const uint8Array = new Uint8Array(buffer);
  console.log("Array", uint8Array);
  const arrayBuffer = buffer.buffer;
  console.log("Array Buffer", arrayBuffer);
  return uint8Array;
};

const getAudioURL = async (audio) => {
  const response = await axios.get(
    `https://graph.facebook.com/v16.0/${audio.id}/`,
    {
      headers: {
        Authorization:
          "Bearer EAAKr5SglLwoBAG9XyMniyL7SAtk4XnsB9tZASIhSHWkC8AXAY4D92KkGqATRUhrPq9Jef7MbuGAHFBlMYaPcdUZBnTJuZAl2ZBxobXcNSBxLp9k31PNaj5mqduCQGOJUON14cVtGfvZAxbDyIZBIZCgjX71hxzyth9GSIDe6bi20ehx7DtDXApfsI6mYU8IDqKrFSpRAltw1AZDZD",
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    }
  );

  return response.data.url;
};

const downloadAudio = async (url, outputPath) => {
  const response = await axios.get(url, {
    headers: {
      Authorization:
        "Bearer EAAKr5SglLwoBAG9XyMniyL7SAtk4XnsB9tZASIhSHWkC8AXAY4D92KkGqATRUhrPq9Jef7MbuGAHFBlMYaPcdUZBnTJuZAl2ZBxobXcNSBxLp9k31PNaj5mqduCQGOJUON14cVtGfvZAxbDyIZBIZCgjX71hxzyth9GSIDe6bi20ehx7DtDXApfsI6mYU8IDqKrFSpRAltw1AZDZD",
    },
    responseType: "arraybuffer",
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  fs.writeFileSync(outputPath, response.data);

  return outputPath;
};

// const transcribeAudio = async (audioFilePath) => {
//   const transcriptionOptions = {
//     model: "whisper-1",
//   };
//   console.log("AudioPath here", audioFilePath);
//   const transcript = await openai.audio.transcribe(
//     transcriptionOptions,
//     audioFilePath
//   );

//   return transcript;
// };

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
      "EAAKr5SglLwoBAG9XyMniyL7SAtk4XnsB9tZASIhSHWkC8AXAY4D92KkGqATRUhrPq9Jef7MbuGAHFBlMYaPcdUZBnTJuZAl2ZBxobXcNSBxLp9k31PNaj5mqduCQGOJUON14cVtGfvZAxbDyIZBIZCgjX71hxzyth9GSIDe6bi20ehx7DtDXApfsI6mYU8IDqKrFSpRAltw1AZDZD",
    senderPhoneNumberId: 109143592105426,
    WABA_ID: 103574209336562,
    graphAPIVersion: "v16.0",
  });

  // res.status(200).send({
  //
  // });

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
      (async () => {
        try {
          const audioUrl = await getAudioURL(message.audio);
          const audioFilePath = await downloadAudio(audioUrl, "audio.mp3");

          const token = "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";
          // const file = audioFilePath;
          const model = "whisper-1";

          const formData = new FormData();
          formData.append("file", fs.createReadStream(audioFilePath));
          formData.append("model", model);

          const config = {
            method: "post",
            url: "https://api.openai.com/v1/audio/transcriptions",
            headers: {
              Authorization: `Bearer ${token}`,
              ...formData.getHeaders(),
            },
            data: formData,
          };

          axios(config)
            .then((response) => {
              console.log(response.data);
            })
            .catch((error) => {
              console.log(error);
              console.log("ERROR DATA", error.data);
              console.log("ERROR message", error.message);
              console.log("ERROR response", error.response);
              console.log("ERROR request", error.request);
            });
          // console.log(transcript);
        } catch (error) {
          console.error(error);
          console.error("Error message", error.message);
        }
      })();
      // try {
      //   const audioFilePath = await getAudioURL(message.audio);
      //   console.log("Path", audioFilePath);
      //   const audioFile = fs.writeFileSync("C:\\", audioFilePath);
      //   console.log("Audio", audioFile);
      //   const transcriptionOptions = {
      //     model: "whisper-1",
      //   };

      //   openai.audio
      //     .transcribe(transcriptionOptions, audioFile)
      //     .then((transcript) => {
      //       console.log(transcript);
      //     })
      //     .catch((err) => {
      //       console.error(err);
      //     });
      // } catch (error) {
      //   res.status(500).send({ error });
      // }
      console.log("An audio message received.");
      break;

    case "image":
      try {
        const imageLink = await getImageURL(message.image);

        // const imageSource = URL.createObjectURL(imageLink);
        console.log("Blob URL", imageLink);

        const getText = await Tesseract.recognize(imageLink, "eng", {
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
      } catch (error) {
        res.status(500).send({ error });
      }
      break;
    case "video":
      await WhatsApp.sendText({
        message: "Video handling coimg soon...",
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
  res.sendStatus(200);
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
