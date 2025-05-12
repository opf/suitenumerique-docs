import logging
import os
import requests
from django.http import HttpResponse
from django.views.decorators.http import require_GET

def tunnel_api(request, path):
    logger = logging.getLogger("django")

    open_project_host = os.environ.get("OPEN_PROJECT_HOST")
    api_key = os.environ.get("OPEN_PROJECT_API_KEY")

    headers = {
        k: v for k, v in request.headers.items()
        if k.lower() not in {"host", "content-length"}
    }
    target_url = f"{open_project_host}/{path}"

    logger.info("TUNNEL: request %s %s body %s" % (request.method, target_url, request.body))

    response = requests.request(
        method=request.method,
        url=target_url,
        headers=headers,
        data=request.body,
        auth=("apikey", api_key),
        verify=False, # no need to check SSL certificates :shrug:
    )

    logger.info("TUNNEL: response %s %s body %s" % (response.status_code, response.url, response.content))

    return HttpResponse(
        response.content,
        status=response.status_code,
        content_type=response.headers.get("Content-Type"),
    )
