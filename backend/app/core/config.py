from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "教育服务客户增长闭环 Demo"
    database_url: str = "sqlite:///./app.db"
    dify_api_base: str = ""
    dify_api_key: str = ""
    dify_app_id: str = ""
    llm_provider: str = "rule_only"
    llm_api_key: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
