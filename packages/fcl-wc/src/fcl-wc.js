import SignClient from "@walletconnect/sign-client"
import QRCodeModal from "@walletconnect/qrcode-modal"
export {getSdkError} from "@walletconnect/utils"

const DEFAULT_PROJECT_ID = "6427e017c4bd829eef203702a51688b0"
const DEFAULT_RELAY_URL = "wss://relay.walletconnect.com"
const DEFAULT_LOGGER = "debug"
const DEFAULT_APP_METADATA = {
  name: "FCL WalletConnect",
  description: "FCL DApp for WalletConnect",
  url: "https://flow.com/",
  icons: ["https://avatars.githubusercontent.com/u/62387156?s=280&v=4"],
}

export const wcAdapter = async (projectID, metadata) => {
  return {
    client: await initClient(projectID, metadata),
    QRCodeModal,
  }
}

const initClient = async (projectID, metadata) => {
  return SignClient.init({
    logger: DEFAULT_LOGGER,
    relayUrl: DEFAULT_RELAY_URL,
    projectId: projectID || DEFAULT_PROJECT_ID,
    metadata: metadata || DEFAULT_APP_METADATA,
  })
}
