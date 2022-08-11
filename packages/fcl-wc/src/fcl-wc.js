import SignClient from "@walletconnect/sign-client"
import {ServicePlugin} from "./service"
export {getSdkError} from "@walletconnect/utils"
import QRCodeModal from "@walletconnect/qrcode-modal"

const DEFAULT_RELAY_URL = "wss://relay.walletconnect.com"
const DEFAULT_LOGGER = "debug"
const DEFAULT_APP_METADATA = {
  name: "FCL WalletConnect",
  description: "FCL DApp for WalletConnect",
  url: "https://flow.com/",
  icons: ["https://avatars.githubusercontent.com/u/62387156?s=280&v=4"],
}

const initClient = async ({projectId, metadata}) => {
  if (typeof projectId === "undefined") {
    throw new Error("WalletConnect projectId is required")
  }
  try {
    return SignClient.init({
      logger: DEFAULT_LOGGER,
      relayUrl: DEFAULT_RELAY_URL,
      projectId: projectId,
      metadata: metadata || DEFAULT_APP_METADATA,
    })
  } catch (error) {
    console.error(error)
    throw error
  }
}

export const initWcAdapter = async ({projectId, metadata} = {}) => {
  const client = await initClient({projectId, metadata})
  const servicePlugin = ServicePlugin(client)

  return {
    servicePlugin,
    client,
    QRCodeModal,
  }
}
