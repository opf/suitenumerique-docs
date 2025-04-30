import os
import requests
from django.http import JsonResponse
from django.views.decorators.http import require_GET

# Create your views here.

@require_GET
def hello_json(request):
    return JsonResponse({"result": "OK"})

def tunnel_api(request):
    response = requests.get(
        "http://openproject.local/api/v3/",
        auth=("apikey", "2e1d4af382b425b2ee1f5c7901c64d7ff93f95df79c90171f7544011aecc8d47"), # local key, please don't use anything actually public
        verify=False, # no need to check SSL certificates :shrug:
    )
    return JsonResponse(response.json())
