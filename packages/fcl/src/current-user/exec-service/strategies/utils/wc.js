import {config} from "@onflow/config"

const noop = () => {}

const DEFAULT_APP_METADATA = {
  name: "Flow WalletConnect",
  description: "Flow DApp for WalletConnect",
  url: "https://flow.com/",
  icons: ["https://avatars.githubusercontent.com/u/62387156?s=280&v=4"],
}

const checkPersistedState = async client => {
  let pairings, storedSession
  if (typeof client === "undefined") {
    throw new Error("WalletConnect is not initialized")
  }
  // populates existing pairings to state
  pairings = client.pairing.getAll({active: true})
  console.log("RESTORED PAIRINGS: ", pairings)

  if (typeof session !== "undefined") return
  // populates (the last) existing session to state
  if (client.session.length) {
    const lastKeyIndex = client.session.keys.length - 1
    storedSession = client.session.get(client.session.keys[lastKeyIndex])
    console.log("RESTORED SESSION:", storedSession)
  }
  return {pairings, storedSession}
}

const connectWc = async (client, QRCodeModal) => {
  let pairing
  if (typeof client === "undefined") {
    throw new Error("WalletConnect is not initialized")
  }
  // Suggest existing pairings (if any).
  const pairings = client.pairing.getAll({active: true})
  if (pairings.length) {
    // openPairingModal()
    console.log("Existing Pairings", pairings)
    pairing = pairings[0]
  } else {
    console.log("connect, pairing topic is:", pairing?.topic)
    // If no existing pairings are available, trigger `WalletConnectClient.connect`.
    try {
      const requiredNamespaces = {
        flow: {
          methods: ["flow_signMessage", "flow_authz", "flow_authn"],
          chains: ["flow:testnet"],
          events: ["chainChanged", "accountsChanged"],
        },
      }
      console.log("requiredNamespaces config for connect:", requiredNamespaces)

      const {uri, approval} = await client.connect({
        // metadata: DEFAULT_APP_METADATA,
        //pairingTopic: pairing?.topic,
        requiredNamespaces,
        message: {},
      })

      // Open QRCode modal if a URI was returned (i.e. we're not connecting an existing pairing).
      if (uri) {
        QRCodeModal.open(uri, () => {
          console.log("EVENT", "QR Code Modal closed")
        })
      }

      const session = await approval()
      console.log("Established session:", session)
      // await onSessionConnected(session)
      // Update known pairings after session is connected.
      // setPairings(client.pairing.getAll({active: true}))
      return session
    } catch (e) {
      console.error("Erroring connecting session", e)
      // ignore rejection
    } finally {
      // close modal in case it was open
      QRCodeModal.close()
    }
  }
}

export async function wc(service, body, opts = {}) {
  if (service == null) return {send: noop, close: noop}
  const onReady = opts.onReady || noop
  const onResponse = opts.onResponse || noop
  const onClose = opts.onClose || noop
  const client = await config.get("wc.client")
  const {pairings, storedSession} = await checkPersistedState(client)

  const send = msg => {
    try {
      console.log("Send", msg)
    } catch (error) {
      console.error("Ext Send Error", msg, error)
    }
  }

  const close = () => {
    try {
      onClose()
    } catch (error) {
      console.error("Ext Close Error", error)
    }
  }

  // onSessionConnected --> gets accounts, etc
  // if pairings === true, need user input, openPairingModal() to select?
  let session = storedSession
  if (session == null) {
    session = await connectWc(client, QRCodeModal)
    console.log("session:", session)
  }

  if (service.endpoint === "flow_authn") {
    try {
      console.log("<--- handle Authn 11 -->", service.endpoint)
      console.log("session  ->", session)
      const result = await client.request({
        topic: session.topic,
        chainId: "flow:testnet",
        request: {
          method: service.endpoint,
          params: [],
        },
      })
      onResponse(result, {
        close: () => QRCodeModal.close(),
      })
      console.log(" handle Authn client ->", result)
    } catch (e) {
      console.error(e)
    }
  }

  if (service.endpoint === "flow_authz") {
    try {
      console.log("<--- handle Authz -->", service, body)
      const result = await client.request({
        topic: session.topic,
        chainId: "flow:testnet",
        request: {
          method: service.endpoint,
          params: JSON.stringify(body),
        },
      })

      onResponse(result, {
        close: () => QRCodeModal.close(),
      })
      console.log(" handle Authz ->", result)
    } catch (e) {
      console.error(e)
    }
  }

  return {send, close}
}
