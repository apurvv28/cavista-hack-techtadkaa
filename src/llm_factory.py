"""LLM factory for LiteLLM proxy or direct Groq API via LiteLLM."""

import os
from typing import Optional, Union

from langchain_community.chat_models import ChatLiteLLM
from langchain_openai import ChatOpenAI


def get_llm(
    model: Optional[str] = None,
    use_proxy: Optional[bool] = None,
    api_key: Optional[str] = None,
    proxy_url: Optional[str] = None,
    temperature: float = 0.1,
    max_tokens: int = 4096,
) -> Union[ChatLiteLLM, ChatOpenAI]:
    """
    Create LLM instance for CrewAI/LangGraph.

    When using LiteLLM proxy:
        - Uses ChatOpenAI with proxy base URL (OpenAI-compatible)
        - model is the model_name from proxy config (e.g., meta-llama/llama-guard-4-12b)

    When using Groq directly via LiteLLM:
        - Uses ChatLiteLLM with groq/ prefix (e.g., groq/meta-llama/llama-guard-4-12b)
    """
    model = model or os.getenv("LLM_MODEL", "groq/llama-3.3-70b-versatile")
    use_proxy = use_proxy if use_proxy is not None else os.getenv("USE_LITELLM_PROXY", "true").lower() == "true"
    api_key = api_key or os.getenv("GROQ_API_KEY")
    proxy_url = proxy_url or os.getenv("LITELLM_PROXY_URL", "http://localhost:4000").rstrip("/")

    if not api_key:
        raise ValueError(
            "GROQ_API_KEY is required. Set it in .env or pass api_key."
        )

    if use_proxy:
        # Call via LiteLLM proxy (OpenAI-compatible endpoint)
        llm = ChatOpenAI(
            model=model,
            openai_api_base=f"{proxy_url}/v1",
            openai_api_key=api_key,
            temperature=temperature,
            max_tokens=max_tokens,
        )
    else:
        # Call Groq directly via LiteLLM
        groq_model = f"groq/{model}" if not model.startswith("groq/") else model
        llm = ChatLiteLLM(
            model=groq_model,
            api_key=api_key,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    return llm
