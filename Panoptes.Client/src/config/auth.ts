import { Amplify } from 'aws-amplify';

export const configureAuth = () => {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
        userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
        loginWith: {
          oauth: {
            domain: import.meta.env.VITE_COGNITO_DOMAIN,
            scopes: ['email', 'profile', 'openid'],
            redirectSignIn: [import.meta.env.VITE_REDIRECT_URI],
            redirectSignOut: [import.meta.env.VITE_REDIRECT_URI],
            responseType: 'code'
          }
        }
      }
    }
  });
};