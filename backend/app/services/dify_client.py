import httpx

from app.core.config import settings


class DifyClient:
    def __init__(self):
        self.api_base = settings.dify_api_base.rstrip("/")
        self.api_key = settings.dify_api_key

    def enabled(self) -> bool:
        return bool(self.api_base and self.api_key)

    async def chat(self, question: str, conversation_id: str | None = None):
        if not self.enabled():
            return {
                "answer": "Dify 未配置，当前返回演示降级结果。",
                "citations": [],
                "conversation_id": conversation_id or "",
                "status": "fallback",
            }

        payload = {
            "inputs": {},
            "query": question,
            "response_mode": "blocking",
            "conversation_id": conversation_id,
            "user": "demo-user",
        }
        headers = {"Authorization": f"Bearer {self.api_key}"}
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(f"{self.api_base}/chat-messages", json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            citations = data.get("metadata", {}).get("retriever_resources", [])
            return {
                "answer": data.get("answer", ""),
                "citations": citations,
                "conversation_id": data.get("conversation_id", ""),
                "status": "success",
            }
