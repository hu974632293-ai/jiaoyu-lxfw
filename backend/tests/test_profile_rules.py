from app.services.profile_rules import assess_profile


def test_singapore_student_profile():
    result = assess_profile("19岁 高中毕业 家庭经济条件较好 希望去新加坡升学")

    assert result["singapore_score"] >= 70
    assert result["matched_project"] == "新加坡国际本硕升学计划"


def test_germany_vocational_profile():
    result = assess_profile("23岁 高中以上学历 动手能力强 希望去德国职业培训并就业")

    assert result["germany_score"] >= 70
    assert result["matched_project"] == "中德精英人才共建计划"
