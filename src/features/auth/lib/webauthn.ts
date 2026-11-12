export function bufferToBase64url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

export function isWebAuthnSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined'
}

export function webAuthnErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'name' in err) {
    const name = (err as { name?: string }).name || ''
    if (name === 'NotAllowedError') return 'Passkey request was cancelled or denied. Please try again.'
    if (name === 'NotFoundError') return 'No passkeys found for this device. Use another sign-in method.'
    if (name === 'NotSupportedError') return 'This browser does not support passkeys. Use another sign-in method.'
    if (name === 'InvalidStateError') return 'This passkey is already registered on this device.'
    if (name === 'SecurityError') return 'Passkey verification was rejected for security reasons. Please try again.'
  }
  if (err instanceof Error) return err.message
  return 'Passkey authentication failed. Please try another method.'
}

interface RegistrationSerialized {
  id: string
  clientDataJSON: string
  attestationObject: string
  transports?: string[]
}

function getCredentialTransports(credential: PublicKeyCredential): string[] | undefined {
  const response = credential.response as AuthenticatorAttestationResponse & { getTransports?: () => string[] }
  if (typeof response.getTransports === 'function') {
    try {
      return response.getTransports()
    } catch {
      // Older browsers reject getTransports after the ceremony has completed
    }
  }
  return undefined
}

export function serializeRegistrationCredential(credential: PublicKeyCredential): RegistrationSerialized {
  const response = credential.response as AuthenticatorAttestationResponse
  return {
    id: bufferToBase64url(credential.rawId),
    clientDataJSON: bufferToBase64url(response.clientDataJSON),
    attestationObject: bufferToBase64url(response.attestationObject),
    transports: getCredentialTransports(credential),
  }
}

interface AssertionSerialized {
  credentialId: string
  clientDataJSON: string
  authenticatorData: string
  signature: string
}

export function serializeAssertionCredential(credential: PublicKeyCredential): AssertionSerialized {
  const response = credential.response as AuthenticatorAssertionResponse
  return {
    credentialId: bufferToBase64url(credential.rawId),
    clientDataJSON: bufferToBase64url(response.clientDataJSON),
    authenticatorData: bufferToBase64url(response.authenticatorData),
    signature: bufferToBase64url(response.signature),
  }
}

interface PasskeyLoginOptionsResponse {
  challenge: string
  rpId: string
  origin: string
  timeout?: number
  allowCredentials?: { type: string; id: string; transports?: string[] }[]
  userVerification?: string
}

export async function requestPasskeyLoginOptions(
  userId: string,
  tempToken: string
): Promise<PasskeyLoginOptionsResponse> {
  const res = await fetch('/api/auth/2fa/webauthn/login/options', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, tempToken }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || data.message || `Passkey sign-in failed (${res.status}).`)
  }
  return data
}

export async function verifyPasskeyLogin(
  userId: string,
  tempToken: string,
  assertion: AssertionSerialized
): Promise<{ user: { token: string; refreshToken: string }; userDefaultLibraryId?: string | null }> {
  const res = await fetch('/api/auth/2fa/webauthn/login/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, tempToken, ...assertion }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || data.message || `Passkey verification failed (${res.status}).`)
  }
  return data
}

interface PasskeyRegisterOptions {
  rp: { name: string; id: string }
  user: { id: string; name: string; displayName: string }
  challenge: string
  pubKeyCredParams: { type: 'public-key'; alg: number }[]
  timeout?: number
  attestation?: string
  excludeCredentials?: { type: string; id: string }[]
  authenticatorSelection?: Record<string, unknown>
  extensions?: Record<string, unknown>
}

export async function requestPasskeyRegisterOptions(
  token: string,
  existingCredentialIds?: string[]
): Promise<PasskeyRegisterOptions> {
  const res = await fetch('/api/auth/2fa/webauthn/register/options', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(existingCredentialIds?.length ? { excludeCredentials: existingCredentialIds } : {}),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || data.message || `Passkey registration failed (${res.status}).`)
  }
  return data
}

export async function verifyPasskeyRegistration(
  token: string,
  registration: RegistrationSerialized,
  deviceName?: string
): Promise<{ success: boolean; enrolled?: string; credentialId?: string }> {
  const res = await fetch('/api/auth/2fa/webauthn/register/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ...registration, ...(deviceName ? { deviceName } : {}) }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || data.message || `Passkey registration verification failed (${res.status}).`)
  }
  return data
}

export async function removePasskey(token: string, credentialId: string): Promise<void> {
  const res = await fetch('/api/auth/2fa/webauthn/passkeys/remove', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ credentialId }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || data.message || `Failed to remove passkey (${res.status}).`)
  }
}

function credentialRequestOptionsFromResponse(options: PasskeyLoginOptionsResponse): CredentialRequestOptions {
  return {
    publicKey: {
      challenge: base64urlToBuffer(options.challenge),
      rpId: options.rpId,
      allowCredentials: (options.allowCredentials || []).map((cred) => ({
        type: 'public-key',
        id: base64urlToBuffer(cred.id),
        ...(cred.transports ? { transports: cred.transports as AuthenticatorTransport[] } : {}),
      })),
      userVerification: (options.userVerification || 'preferred') as UserVerificationRequirement,
      timeout: options.timeout || 60_000,
    },
  }
}

export async function performPasskeyLogin(
  userId: string,
  tempToken: string
): Promise<{ user: { token: string; refreshToken: string }; userDefaultLibraryId?: string | null }> {
  if (!isWebAuthnSupported()) {
    throw new Error('Passkeys are not supported in this browser. Use another sign-in method.')
  }
  const options = await requestPasskeyLoginOptions(userId, tempToken)
  const credential = (await navigator.credentials.get(
    credentialRequestOptionsFromResponse(options)
  )) as PublicKeyCredential | null
  if (!credential) {
    throw new Error('Passkey sign-in was cancelled.')
  }
  return verifyPasskeyLogin(userId, tempToken, serializeAssertionCredential(credential))
}

export async function performPasskeyRegistration(
  token: string,
  opts?: { deviceName?: string; existingCredentialIds?: string[] }
): Promise<{ success: boolean; enrolled?: string; credentialId?: string }> {
  if (!isWebAuthnSupported()) {
    throw new Error('Passkeys are not supported in this browser.')
  }
  const options = await requestPasskeyRegisterOptions(token, opts?.existingCredentialIds)

  const publicKeyOptions: PublicKeyCredentialCreationOptions = {
    rp: options.rp,
    user: {
      ...options.user,
      id: base64urlToBuffer(options.user.id),
    },
    challenge: base64urlToBuffer(options.challenge),
    pubKeyCredParams: options.pubKeyCredParams,
    timeout: options.timeout || 60_000,
    attestation: (options.attestation || 'none') as AttestationConveyancePreference,
    excludeCredentials: (options.excludeCredentials || []).map((cred) => ({
      type: 'public-key',
      id: base64urlToBuffer(cred.id),
    })),
    authenticatorSelection: options.authenticatorSelection,
    ...(options.extensions ? { extensions: options.extensions } : {}),
  }

  const credential = (await navigator.credentials.create({
    publicKey: publicKeyOptions,
  })) as PublicKeyCredential | null
  if (!credential) {
    throw new Error('Passkey registration was cancelled.')
  }
  return verifyPasskeyRegistration(
    token,
    serializeRegistrationCredential(credential),
    opts?.deviceName || 'Web Browser'
  )
}
