import {isTransaction, Ok} from "../interaction/interaction.js"
import {send as defaultHTTPSend} from "@onflow/transport-http"
import * as ixModule from "../interaction/interaction.js"
import {response as responseModule} from "../response/response.js"
import {config} from "../config"
import {decodeResponse} from "../decode/decode.js"
import {getAccount} from "../build/build-get-account.js"
import {build} from "../build/build.js"

export const resolveProposerSequenceNumber = ({ node }) => async (ix) => {
  if (!(isTransaction(ix))) return Ok(ix)
  if (ix.accounts[ix.proposer].sequenceNum) return Ok(ix)

  const sendFn = await config.first(
    ["sdk.transport", "sdk.send"],
    defaultHTTPSend
  )

  const response = await sendFn(
    await build([
      getAccount(ix.accounts[ix.proposer].addr)
    ]),
    {config, response: responseModule, ix: ixModule},
    {node}
  )
  const decoded = await decodeResponse(response)

  ix.accounts[ix.proposer].sequenceNum = decoded.keys[ix.accounts[ix.proposer].keyId].sequenceNumber

  return Ok(ix)
}
