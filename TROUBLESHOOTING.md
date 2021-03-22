# Troubleshooting

## Getting 'Your connection is not private' in Chromium-based browsers

You'd probably run into this issue when running in browsers like Chrome because it does not acknowledge our self-signed certificate. If so, you can follow this [guide](https://www.technipages.com/google-chrome-bypass-your-connection-is-not-private-message) on how to by pass this issue:

1. In the browser address bar, type `chrome://flags/#allow-insecure-localhost` and switch to `Enable`.
2. Go to the page again `localhost:8080/studio`, you should still see the warning. However, now, click somewhere on the page and type `thisisunsafe` and you should see the page gets reloaded and display properly.

## Getting `Unauthorized` and 401 call to SDLC after logging into Gitlab and being redirected to Studio

Clear all cookies for the site (including SDLC, engine, and Studio) and try to refresh. As a quick try, you can open Studio in a incognito window.
