def ok(data=None, msg: str = "success"):
    return {"code": 0, "msg": msg, "data": data}


def fail(msg: str, code: int = 40000, data=None):
    return {"code": code, "msg": msg, "data": data}
