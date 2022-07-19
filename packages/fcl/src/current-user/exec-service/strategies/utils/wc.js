import {config} from "@onflow/config"
import {QRCodeModal} from "../../../../../../fcl-wc/src/fcl-wc"

const noop = () => {}

const checkPersistedState = async client => {
  let pairings, storedSession
  pairings = client.pairing.getAll({active: true})

  // populates (the last) existing session to state
  if (client.session.length) {
    const lastKeyIndex = client.session.keys.length - 1
    storedSession = client.session.get(client.session.keys[lastKeyIndex])
  }
  return {pairings, storedSession}
}

const connectWc = async ({client, QRCodeModal, pairing}) => {
  try {
    const requiredNamespaces = {
      flow: {
        methods: ["flow_signMessage", "flow_authz", "flow_authn"],
        chains: ["flow:testnet"],
        events: ["chainChanged", "accountsChanged"],
      },
    }
    console.log("connect pairing topic is:", pairing?.topic, pairing)
    console.log("requiredNamespaces config for connect:", requiredNamespaces)

    const {uri, approval} = await client.connect({
      pairingTopic: pairing?.topic,
      requiredNamespaces,
    })

    console.log("connect uri:", uri, "approval:", approval)
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
  } finally {
    QRCodeModal.close()
  }
}

export async function wc(service, body, opts = {}) {
  if (service == null) return {send: noop, close: noop}
  const onReady = opts.onReady || noop
  const onResponse = opts.onResponse || noop
  const onClose = opts.onClose || noop
  const client = await config.get("wc.client")
  if (typeof client === "undefined") {
    throw new Error("WalletConnect is not initialized")
  }
  const {pairings, storedSession} = await checkPersistedState(client)
  console.log("stored pairings", pairings, "stored session:", storedSession)

  let session = storedSession
  if (session == null) {
    let pairing = {topic: service.provider.address ?? undefined}
    session = await connectWc({
      client,
      QRCodeModal,
      pairing,
    })
    console.log("session connected:", session)
  }

  if (service.endpoint === "flow_authn") {
    try {
      console.log("<--- handle Authn 11 -->", service.endpoint)
      const result = await client.request({
        topic: session.topic,
        chainId: "flow:testnet",
        request: {
          method: service.endpoint,
          params: [],
        },
      })
      console.log(" handle Authn result ->", result)
      onResponse(result, {
        close: () => QRCodeModal.close(),
      })
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
  return {send, close}
}
