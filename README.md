# Epic OIDC Example

[Here's the commit that adds Google Auth](https://github.com/kentcdodds/epic-oidc/commit/cb5a67d1b2fde82522f20b3bb43a2da7a5d1df15).

This is an updated and simplified version, but the demo for the original version
is still instructive:

[![A frame from a screen cast video of Kent demonstrating the connections page from this demo](https://github-production-user-asset-6210df.s3.amazonaws.com/1500684/260885255-938f0150-51a6-47ae-a9ae-daa09c0c6b9d.png)](https://www.epicweb.dev/tips/add-open-id-connect-auth-to-the-epic-stack)

This is an
[Epic Stack example](https://github.com/epicweb-dev/epic-stack/blob/main/docs/examples.md)
which demonstrates how to implement authentication using an OpenID Connect
provider.

In this example, we have three forms of authentication:

1. Username/password (built-into the Epic Stack)
2. GitHub OAuth2 (built-into the Epic Stack)
3. Google OpenID Connect (implemented in this example)

There are no database schema changes necessary for adding an OIDC provider (like
Google).

This example uses [web-oidc](https://npm.im/web-oidc) and
[remix-auth](https://npm.im/remix-auth) to implement the OIDC authentication
flow. This example doesn't deal with refresh tokens because we're only using the
OIDC provider for authentication. If you need to use refresh tokens, then you'll
need to store them in a database and use them to get new access tokens when
necessary.
