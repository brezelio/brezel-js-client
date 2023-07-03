import {Path} from "./brezel";

export const apiLink = (path: Path, params: Record<string, unknown>, apiUrl: string, system: string | undefined) => {
  // Do not use store
  let urlString = apiUrl;
  if (system !== undefined) {
    urlString += '/' + system;
  }
  urlString = urlString + '/' + path.join('/');
  if (urlString.endsWith('/')) {
    // Remove trailing slashes because the API responds with a redirect otherwise, leading to CORS errors.
    // TODO: discuss whether we can remove this behaviour defined in public/.htaccess
    urlString = urlString.substring(0, urlString.length - 1);
  }
  const url = new URL(urlString);
  if (params !== undefined && Object.keys(params).length > 0) {
    Object.keys(params).forEach(key => {
      const param = params[key];
      if (param !== undefined) {
        url.searchParams.append(key, typeof param === 'string' ? param : JSON.stringify(param));
      }
    });
  }
  return url;
};