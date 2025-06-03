# Configuration specifics for the OpenProject exploration

## Choosing which stack

TODO: Clarify why one should ever not use the TLS stack? If there is not good reason, we should not pronunce it much here.

Depending on which stack to run, choose different compose files to run the stack. This can be done by setting or
unsetting the environmental variable `TLS`.

### Local stack

TODO: Check if that section is necessary. If so, explain when. Maybe push it further down in this README.

```shell
# Running the local stack and access docs at localhost:3001
make run-frontend-development
make run-backend
```

### TLS stack

The TLS ready Docs stack does not use the Keycloak from La Suite.
Instead, one must use the Keycloak from the OpenProject Docker Dev stack, which is already documented quite well in the OpenProject docs.

Also, there are a couple of things to set in the `env.d/common` file, like 
the now changed redirect URLs. Those variables are used while building the images.

In Keycloak when configuring the docs client also allow non https redirect_uri.

If one observes, once running, redirects to in the browser to localhost:8083, probably the Docs dev images were built without the TLS="true" variable, so usually one must do this:

```shell
# Running the tls-ready stack and access docs at docs.local
export TLS=true
make build-backend
make build-frontend
make run
make migrate
```

