# Configuration specifics for the OpenProject exploration

## Choosing which stack

Depending on which stack to run, choose different compose files to run the stack. This can be done by setting or
unsetting the environmental variable `TLS`.

### Local stack

```shell
# Running the local stack and access docs at localhost:3001
make run-frontend-development
make run-backend
```

### TLS stack

```shell
# Running the tls-ready stack and access docs at docs.local
TLS=true make run
```
