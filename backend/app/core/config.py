from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "教育服务客户增长闭环 Demo"
    database_url: str = "sqlite:///./app.db"
    app_env: str = "development"
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 120
    cors_origins: str = "http://127.0.0.1:5173,http://localhost:5173"
    allow_legacy_actor_header: bool = True
    dify_api_base: str = ""
    dify_api_key: str = ""
    dify_app_id: str = ""
    llm_provider: str = "rule_only"
    llm_api_key: str = ""

    dify_app_id_map: str = "customer_service:,enterprise_guide:,student_life:,policy:"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
