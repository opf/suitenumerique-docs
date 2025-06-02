import jwt

from django.http import JsonResponse
from django.contrib.auth.decorators import login_required

@login_required
def debug_token(request):
    # The actual key may vary depending on your OIDC library and configuration.
    # Common session keys are 'oidc_access_token', 'oidc_id_token', or similar.
    access_token = request.session.get('oidc_access_token')
    id_token = request.session.get('oidc_id_token')

    debug_info = {
        'access_token': access_token,
        'id_token': id_token,
        'session_keys': list(request.session.keys()),
    }

    # For debugging: print to console or log
    print("Access token:", access_token)
    print("Decoded:", jwt.decode(access_token, options={"verify_signature": False}))
    print("ID token:", id_token)

    # Return as JSON for convenient inspection in browser or via curl
    return JsonResponse(debug_info)
