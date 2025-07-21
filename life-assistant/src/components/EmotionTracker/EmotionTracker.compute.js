import { adviceList } from "./EmotionTracker.data";

export let customInstructions = ({ emotionNote, selectedEmotion, user }) => {
  let note = `The individual has included additional notes about how they feel: ${emotionNote}`;

  const instructions = `I'm giving you context and advice about the individual you're replying to. Do not reference this information, it's just to help you generate good responses. Please take on the role as an intelligent and gentle mentor that's expert in confidence and self-esteem in the responses you're giving. Never include pet names. The individual is sharing how they feel today and may add additional context about that emotion. Have a sense of humor when appropriate.

User Profile:\n${JSON.stringify(user || {}, null, 2)}

  Return a response recognizing that an individual has shared that they feel ${selectedEmotion?.label?.toLowerCase()}.

    ${emotionNote.length > 3 ? note : ""}

Additionally, include some suggestions to maintain improvements going forward. Do not include any markdown editing, only respond as if you're replying in a message.
    `;

  return instructions;
};

export let emotionSummarizer = (emotionData, user) => {
  const instructions = `I'm giving you context and advice about the individual you're replying to. Do not reference this information, it's just to help you generate good responses. Please take on the role as an intelligent and gentle mentor that's expert in confidence and self-esteem in the responses you're giving.

User Profile:\n${JSON.stringify(user || {}, null, 2)}

  Please return a response recognizing that an individual has shared that they feel the following emotions ${emotionData}

  Please provide meaningful advice or wisdom to help individuals process these feelings in a healthy way. Summarize their journey recognizing their time spent processing emotions over time.
  `;

  return instructions;
};

export let formatEmotionItem = (item, extraData, key) => {
  let result = item;

  if (extraData) {
    result[key] = extraData;
  }

  return result;
};

export const formatFriendlyDate = (timestamp) => {
  const date = new Date(timestamp);

  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };
  const friendlyDate = new Intl.DateTimeFormat("en-US", options).format(date);
  return friendlyDate;
};

export const selectRandomAdvice = () => {
  const randomIndex = Math.floor(Math.random() * adviceList.length);
  return adviceList[randomIndex];
};
