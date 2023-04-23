import express, { response } from "express";
import * as dotenv from "dotenv";
import cors from "cors";
import { Configuration, OpenAIApi } from "openai";
import WhatsappCloudAPI from "whatsappcloudapi_wrapper";
import Tesseract from "tesseract.js";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import { exec } from "child_process";
import textToSpeech from "@google-cloud/text-to-speech";
import util from "util";

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
        "Bearer EAAKr5SglLwoBAM1fZCM9Mi64i1qITymJwpV4zM8xKcyd4D8q4sty2d0zIurBSzP7jI2au4PpHqimgXQhZBZCixikodoNksPHOZAmZAkmB6YNZBftvZCfbZBFOgMOJEgtdEYOsJ0uSeG85Ol9odnZA0GK632Mc79Dik2CbIRYO5KFQf8kD3KZA68ygVkGsq7UYXHEASGyOB8Y6WuwZDZD",
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
        "Bearer EAAKr5SglLwoBAM1fZCM9Mi64i1qITymJwpV4zM8xKcyd4D8q4sty2d0zIurBSzP7jI2au4PpHqimgXQhZBZCixikodoNksPHOZAmZAkmB6YNZBftvZCfbZBFOgMOJEgtdEYOsJ0uSeG85Ol9odnZA0GK632Mc79Dik2CbIRYO5KFQf8kD3KZA68ygVkGsq7UYXHEASGyOB8Y6WuwZDZD",
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
const Convos = new Map();

const getAudioURL = async (audio) => {
  const response = await axios.get(
    `https://graph.facebook.com/v16.0/${audio.id}/`,
    {
      headers: {
        Authorization:
          "Bearer EAAKr5SglLwoBAM1fZCM9Mi64i1qITymJwpV4zM8xKcyd4D8q4sty2d0zIurBSzP7jI2au4PpHqimgXQhZBZCixikodoNksPHOZAmZAkmB6YNZBftvZCfbZBFOgMOJEgtdEYOsJ0uSeG85Ol9odnZA0GK632Mc79Dik2CbIRYO5KFQf8kD3KZA68ygVkGsq7UYXHEASGyOB8Y6WuwZDZD",
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
        "Bearer EAAKr5SglLwoBAM1fZCM9Mi64i1qITymJwpV4zM8xKcyd4D8q4sty2d0zIurBSzP7jI2au4PpHqimgXQhZBZCixikodoNksPHOZAmZAkmB6YNZBftvZCfbZBFOgMOJEgtdEYOsJ0uSeG85Ol9odnZA0GK632Mc79Dik2CbIRYO5KFQf8kD3KZA68ygVkGsq7UYXHEASGyOB8Y6WuwZDZD",
    },
    responseType: "arraybuffer",
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  fs.writeFileSync(outputPath, response.data);

  return outputPath;
};

const convertAudio = (inputPath, outputPath, format) => {
  return new Promise((resolve, reject) => {
    const command = `ffmpeg -i ${inputPath} -vn -ar 44100 -ac 2 -ab 192k -f ${format} ${outputPath}`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(outputPath);
      }
    });
  });
};

const getVoice = async (client, input) => {
  // The text to synthesize
  const text = input;

  // Construct the request
  const request = {
    input: { text: text },
    // Select the language and SSML voice gender (optional)
    voice: { languageCode: "en-US", ssmlGender: "NEUTRAL" },
    // select the type of audio encoding
    audioConfig: { audioEncoding: "MP3" },
  };

  // Performs the text-to-speech request
  const [response] = await client.synthesizeSpeech(request);
  // Write the binary audio content to a local file
  const writeFile = util.promisify(fs.writeFile);
  await writeFile("output.mp3", response.audioContent, "binary");
  console.log("Audio content written to file: output.mp3");
  return writeFile;
};

const getTranscript = async (audioFile) => {
  try {
    const response = await openai.createTranscription(
      fs.createReadStream(audioFile),
      "whisper-1",
      undefined,
      "json",
      1,
      "en"
    );

    // const response = await axios(config);
    return response;
  } catch (error) {
    console.error(error);
    console.error("Response", error.response);
    throw error;
  }
};

const getResponse = async (prompt, sender) => {
  switch (prompt.toLowerCase()) {
    case "hello":
      return "Hi, how may I help you?";
      break;
    case "jasper":
      return `Hi ${sender.profile.name}, How may I help you?`;
      break;
    case "hi jasper":
      return `Hello ${sender.profile.name}.`;
      break;
    case "hi":
      return "Hello, need my help ?";
      break;
    case "who are you":
      return "I am Jasper - a WhatsApp chatbot programmed by Ezekiel A. Tobiloba";
      break;
    case "who are you?":
      return "I am Jasper - a WhatsApp chatbot programmed by Ezekiel A. Tobiloba";
      break;
    case "what can you do":
      return "1. Give responses to your text queries.\n2. Transcribe text from audios or voice notes you send and provide responses to them.\n3. Scan images to decode texts and send the texts in them to you.";
      break;
    case "what can you do?":
      return "1. Give responses to your text queries.\n2. Transcribe text from audios or voice notes you send and provide responses to them.\n3. Scan images to decode texts and send the texts in them to you.";
      break;
    case "what are you?":
      return "A WhatsApp chatbot.";
      break;
    case "what are you":
      return "A WhatsApp chatbot.";
      break;
    case "who made you?":
      return "This chatbot was created by Ezekiel A. Tobiloba - A Frontend Engineer and Mobile App Developer";
      break;
    case "who made you":
      return "This chatbot was created by Ezekiel A. Tobiloba - A Frontend Engineer and Mobile App Developer";
      break;
    case "what does jasper mean":
      return "Only Ezekiel knows but I presume it is a cool name, isn't it?";
      break;
    case "what does jasper mean?":
      return "Only Ezekiel knows but I presume it is a cool name, isn't it?";
      break;
    case "stop":
      return "What should I stop ?";
      break;
    case "start":
      "What should I start ?";
      break;
    case "rest":
      return "NO, I doubt other users want me to.";
      break;
    default:
      const context = Convos.get(sender.wa_id).chat;
      try {
        const response = await openai.createCompletion({
          model: "text-davinci-003",
          prompt: `${context.length > 0 && context} \n ${prompt}`,
          temperature: 1,
          max_tokens: 3000,
          top_p: 1,
          frequency_penalty: 0.5,
          presence_penalty: 0,
        });
        return response.data.choices[0].text;
      } catch (error) {
        console.log(error);
      }

      break;
  }
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
  const currentUser = message.from;

  console.log("See", body.entry[0].id);
  console.log("Sender", sender);
  console.log(message);

  if (body.entry[0].changes[0].field !== "messages") {
    // not from the messages webhook so dont process
    return res.sendStatus(400);
  }

  const WhatsApp = new WhatsappCloudAPI({
    accessToken:
      "EAAKr5SglLwoBAM1fZCM9Mi64i1qITymJwpV4zM8xKcyd4D8q4sty2d0zIurBSzP7jI2au4PpHqimgXQhZBZCixikodoNksPHOZAmZAkmB6YNZBftvZCfbZBFOgMOJEgtdEYOsJ0uSeG85Ol9odnZA0GK632Mc79Dik2CbIRYO5KFQf8kD3KZA68ygVkGsq7UYXHEASGyOB8Y6WuwZDZD",
    senderPhoneNumberId: 109143592105426,
    WABA_ID: 103574209336562,
    graphAPIVersion: "v16.0",
  });

  if (!Convos.get(currentUser)) {
    Convos.set(currentUser, {
      chat: [],
    });
  }
  //  else {
  //   Convos.get(currentUser).chat.push(`user: ${message.text.body}`);
  //   console.log("Session created");
  // }

  const client = new textToSpeech.TextToSpeechClient();

  switch (message.type) {
    case "text":
      Convos.get(currentUser).chat.push(message.text.body);
      try {
        const prompt = message.text.body;
        const reply = await getResponse(prompt, sender);
        Convos.get(currentUser).chat.push(reply);
        console.log(Convos);
        await WhatsApp.sendText({
          message: reply,
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
      try {
        const audioUrl = await getAudioURL(message.audio);
        const audioFilePath = await downloadAudio(audioUrl, "audio.ogg");
        const audioFilePathConverted = await convertAudio(
          audioFilePath,
          "audio.mp3",
          "mp3"
        );

        // const token = "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";
        // const file = audioFilePathConverted;
        // const model = "whisper-1";

        // const formData = new FormData();
        // formData.append("file", fs.createReadStream(file));
        // formData.append("model", model);

        // const config = {
        //   method: "post",
        //   url: "https://api.openai.com/v1/audio/transcriptions",
        //   headers: {
        //     Authorization: `Bearer ${token}`,
        //     ...formData.getHeaders(),
        //   },
        //   data: formData,
        // };

        const transcript = await getTranscript(audioFilePathConverted);
        console.log("Transcription", transcript);

        const response = await getResponse(transcript.data.text, sender);

        await WhatsApp.sendText({
          message: response,
          recipientPhone: sender.wa_id,
        })
          .then((result) => {
            console.log(result);
          })
          .catch((error) => {
            console.error(error);
          });

        const speech = await getVoice(client, response);

        await WhatsApp.sendAudio({
          recipientPhone: sender.wa_id,
          caption: `${transcript}`,
          file_path: `${speech}`,
          file_name: "Jasper Answers",
        })
          .then((result) => {
            console.log(result);
          })
          .catch((error) => {
            console.error(error);
          });
      } catch (error) {
        console.error(error);
      }

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
