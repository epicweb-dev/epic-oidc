# Epic OIDC Example

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
Google). There are two ways to go about adding another auth provider.

1. You can duplicate a lot of the GitHub auth code because much of it will be
   the same. I did that in
   [this commit](https://github.com/kentcdodds/epic-oidc/commit/229f8a0f7be9e9d19f5baf8b583f88acf98f749c).
2. You can make the provider stuff generic and use it for both GitHub and OIDC,
   which is what the final version of this repository looks like (and what I
   would recommend if you plan on having more than one auth provider). You'll
   find that work in
   [this commit](https://github.com/kentcdodds/epic-oidc/commit/282052c43469e5f01dcfc8b1247b7c9e4d1f0391)
   which builds on the first.

This example uses [web-oidc](https://npm.im/web-oidc) and
[remix-auth](https://npm.im/remix-auth) to implement the OIDC authentication
flow. This example doesn't deal with refresh tokens because we're only using the
OIDC provider for authentication. If you need to use refresh tokens, then you'll
need to store them in a database and use them to get new access tokens when
necessary.

## Adding a new Auth Provider

Because we've made the auth provider generic, adding a new one is relatively
straightforward:

1. Add the provider's name in
   [`app/utils/connections.tsx`](./app/utils/connections.tsx)
   (`export const {YOUR_AUTH_PROVIDER}_PROVIDER_NAME = 'your-auth-provider'`)
   and add that to the `providerNames` array. This will create type errors which
   once fixed, will ensure that you've updated all the necessary places.
1. Create a new file for them in
   [`app/utils/providers/{provider-name}.server.ts`](./app/utils/providers) and
   follow the pattern of the other providers by implementing the
   [`AuthProvider`](./app/utils/providers/provider.ts) interface.
1. That's it, you're done.

You'll probably be required to set up private keys and other things which will
likely require a bit of work in [`.env.example`](./.env.example), `.env`, and
[`app/utils/env.server.ts`](./app/utils/env.server.ts).

The cool thing about this approach is it doesn't actually make a difference
whether you're using an OIDC provider or not. As long as you satisfy the
`AuthProvider` interface, you're golden (which is why GitHub's OAuth2 provider
is supported in the same manner).
