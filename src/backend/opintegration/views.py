import logging
import os
import requests
from django.http import HttpResponse
from django.views.decorators.http import require_GET

def tunnel_api(request, path):
    logger = logging.getLogger("django")

    open_project_host = os.environ.get("OPEN_PROJECT_HOST")
    access_token = request.session.get('oidc_access_token')

    headers = {
        k: v for k, v in request.headers.items()
        if k.lower() not in {"host", "content-length"}
    }

    headers = headers | { "Authorization": f"Bearer {access_token}" }

    target_url = f"{open_project_host}/{path}"
    if request.META.get('QUERY_STRING'):
        target_url = f"{target_url}?{request.META['QUERY_STRING']}"

    logger.info("TUNNEL:\n\trequest %s %s\n\tbody %s\n\theaders %s" % (request.method, target_url, request.body, headers))

    response = requests.request(
        method=request.method,
        url=target_url,
        headers=headers,
        data=request.body,
        verify=False, # no need to check SSL certificates :shrug:
    )

    logger.info("TUNNEL: response %s %s body %s" % (response.status_code, response.url, response.content))

    return HttpResponse(
        response.content,
        status=response.status_code,
        content_type=response.headers.get("Content-Type"),
    )
