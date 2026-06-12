type RecognitionResultLike = {
  length: number;
  [index: number]: { transcript: string } | undefined;
};

type RecognitionEventLike = {
  results: ArrayLike<RecognitionResultLike>;
};

type RecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
};

type RecognitionConstructor = new () => RecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  }
}

export function startSpeechToText(onText: (text: string) => void, onError: (message: string) => void): boolean {
  const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!Recognition) {
    onError("当前浏览器不支持语音识别，请直接粘贴转写文本。");
    return false;
  }
  const recognition = new Recognition();
  recognition.lang = "zh-CN";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0]?.transcript ?? "")
      .join("")
      .trim();
    if (transcript) {
      onText(transcript);
    }
  };
  recognition.onerror = () => onError("语音识别暂时不可用，请直接粘贴转写文本。");
  recognition.start();
  return true;
}
