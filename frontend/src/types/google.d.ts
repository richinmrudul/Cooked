// src/types/google.d.ts
declare global {
  namespace google {
    namespace accounts {
      namespace id {
        // Updated CredentialResponse interface
        interface CredentialResponse {
          credential: string; // The ID token
          select_by:
            | 'auto'
            | 'user'
            | 'wmd_bp'
            | 'wmd_dm'
            | 'wmd_fs'
            | 'wmd_re'
            | 'wmd_sl'
            | 'code_flow';
          client_id: string; // Added client_id for more complete type
          jti: string; // JWT ID
          aud: string; // Audience
          exp: number; // Expiration time
          iat: number; // Issued at time
          iss: string; // Issuer
          sub: string; // Subject (user's unique Google ID)
          azp: string; // Authorized presenter
          email: string;
          email_verified: boolean;
          name: string;
          picture: string;
          given_name: string;
          family_name: string;
          locale: string;
          // Add other properties you might access from the payload if needed
        }

        interface IdConfiguration {
          client_id: string;
          callback: (response: CredentialResponse) => void;
          auto_select?: boolean;
          cancel_on_tap_outside?: boolean;
          context?: 'signin' | 'signup' | 'use';
          login_uri?: string;
          nonce?: string;
          state_cookie_domain?: string;
          native_callback?: (response: CredentialResponse) => void;
          prompt_parent_id?: string;
          hd?: string;
          ux_mode?: 'popup' | 'redirect';
          redirect_uri?: string;
        }

        function initialize(config: IdConfiguration): void;
        function renderButton(
          parent: HTMLElement,
          options: {
            theme?: 'outline' | 'filled_blue' | 'filled_black';
            size?: 'large' | 'medium' | 'small';
            type?: 'standard' | 'icon';
            text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
            shape?: 'rectangular' | 'circle' | 'square' | 'pill';
            logo_alignment?: 'left' | 'center';
            width?: string;
            locale?: string;
            click_listener?: () => void;
          }
        ): void;
        function prompt(callback?: (notification: any) => void): void;
        function revoke(client_id: string, callback?: (response: { status: string }) => void): void;
      }
    }
  }
  interface Window {
    google: typeof google;
  }
}