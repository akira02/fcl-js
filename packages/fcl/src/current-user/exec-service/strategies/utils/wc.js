import {config} from "@onflow/config"

const noop = () => {}

const connectWc = async ({client, QRCodeModal, pairing}) => {
  try {
    const requiredNamespaces = {
      flow: {
        methods: ["flow_signMessage", "flow_authz", "flow_authn"],
        chains: ["flow:testnet"],
        events: ["chainChanged", "accountsChanged"],
      },
    }

    const {uri, approval} = await client.connect({
      pairingTopic: pairing?.topic,
      requiredNamespaces,
    })

    if (uri) {
      QRCodeModal.open(uri, () => {
        console.log("EVENT", "QR Code Modal closed")
      })
    }

    const session = await approval()
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
  const {client, QRCodeModal} = await config.get("wc.adapter")
  if (typeof client === "undefined") {
    throw new Error("WalletConnect is not initialized")
  }
  let session
  if (client.session.length) {
    const lastKeyIndex = client.session.keys.length - 1
    session = client.session.get(client.session.keys[lastKeyIndex])
  }
  if (session == null) {
    let pairing = {topic: service.provider.address ?? undefined}
    session = await connectWc({
      client,
      QRCodeModal,
      pairing,
    })
  }

  const addr = session?.namespaces["flow"].accounts[0].split(":")[2]
  if (service.endpoint === "flow_authn") {
    try {
      const result = await client.request({
        topic: session.topic,
        chainId: "flow:testnet",
        request: {
          method: service.endpoint,
          params: [JSON.stringify({addr})],
        },
      })
      onResponse(result, {
        close: () => QRCodeModal.close(),
      })
    } catch (e) {
      console.error(e)
    }
  }

  if (service.endpoint === "flow_authz") {
    try {
      const result = await client.request({
        topic: session.topic,
        chainId: "flow:testnet",
        request: {
          method: service.endpoint,
          params: [JSON.stringify(body)],
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
