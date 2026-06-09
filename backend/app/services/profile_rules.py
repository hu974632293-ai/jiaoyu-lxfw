import re


def _contains(text: str, words: list[str]) -> bool:
    return any(word in text for word in words)


def _extract_age(text: str) -> int | None:
    match = re.search(r"(\d{1,2})\s*岁", text)
    return int(match.group(1)) if match else None


def assess_profile(raw_input: str):
    text = raw_input.strip()
    age = _extract_age(text)
    education = "未知"

    if _contains(text, ["初中"]):
        education = "初中"
    elif _contains(text, ["高中", "中职", "中专", "技校"]):
        education = "高中或同等学历"
    elif _contains(text, ["专科", "大专"]):
        education = "专科"
    elif _contains(text, ["本科"]):
        education = "本科"

    singapore_score = 0
    germany_score = 0
    reasons: list[str] = []
    suggested_actions: list[str] = []

    if age is not None and 14 <= age <= 24:
        singapore_score += 25
        reasons.append("年龄符合新加坡升学项目常见客户群")
    if education in ["初中", "高中或同等学历", "专科", "本科"]:
        singapore_score += 25
        reasons.append("学历背景可匹配新加坡升学路径")
    if _contains(text, ["升学", "本科", "硕士", "学历", "就业"]):
        singapore_score += 30
        reasons.append("存在升学或就业导向需求")
    if _contains(text, ["家庭经济", "家里很有钱", "预算", "费用"]):
        singapore_score += 15
        reasons.append("资料中出现经济条件或预算相关信息")

    if age is not None and 18 <= age <= 35:
        germany_score += 25
        reasons.append("年龄符合德国双元制项目要求")
    if education in ["高中或同等学历", "专科", "本科"]:
        germany_score += 25
        reasons.append("学历满足德国项目高中及以上要求")
    if _contains(text, ["动手", "职业", "培训", "就业", "移民", "德国"]):
        germany_score += 35
        reasons.append("存在职业培训、就业或德国方向意向")
    if _contains(text, ["德语", "B1", "语言"]):
        germany_score += 10
        reasons.append("资料中出现德语或语言学习能力信息")

    missing_fields = []
    if age is None:
        missing_fields.append("年龄")
    if education == "未知":
        missing_fields.append("学历")
    if not _contains(text, ["电话", "手机", "联系", "1"]):
        missing_fields.append("联系方式")

    if singapore_score >= germany_score:
        matched_project = "新加坡国际本硕升学计划"
        suggested_actions.append("邀请客户参加新加坡升学路径线上说明会")
    else:
        matched_project = "中德精英人才共建计划"
        suggested_actions.append("补充确认德语学习能力、职业方向和赴德意愿")

    return {
        "extracted_profile": {
            "age": age,
            "education": education,
            "raw_summary": text[:120],
        },
        "singapore_score": min(singapore_score, 100),
        "germany_score": min(germany_score, 100),
        "matched_project": matched_project,
        "reasons": reasons,
        "missing_fields": missing_fields,
        "suggested_actions": suggested_actions,
    }
