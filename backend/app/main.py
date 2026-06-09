from fastapi import FastAPI

app = FastAPI(title="教育服务客户增长闭环 Demo")


@app.get("/health")
def health_check():
    return {"code": 0, "msg": "success", "data": {"status": "ok"}}
