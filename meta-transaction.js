const { ethers } = require("ethers");
const axios = require("axios").default;

const wallet = new ethers.Wallet(
  "0xaf1ccdbd39b6e31cc8cd74e3af698d6fe42b676ebbe20295b3ea4ca591a19cb2",
  new ethers.providers.JsonRpcProvider(
    `https://polygon-${"mumbai"}.infura.io/v3/45f2e4f4ce3f483b8472f5f77f12c50d`
  )
);

const minterABI = ["function mintEdition(address collection, address _to)"];
const editionCreatorABI = [
  "function createEdition(string memory _name, string memory _symbol, string memory _description, string memory _animationUrl, bytes32 _animationHash, string memory _imageUrl, bytes32 _imageHash, uint256 _editionSize, uint256 _royaltyBPS, address minter) returns(uint256)",
];

const onePerAddressMinterContract =
  "0x50c001362FB06E2CB4D4e8138654267328a8B247";
const metaSingleEditionMintableCreator =
  "0x50c001c0aaa97B06De431432FDbF275e1F349694";

const getAccessToken = async () => {
  const {
    data: { data: nonce },
  } = await axios.get(
    `https://testingservice-dot-showtimenft.wl.r.appspot.com/api/v1/getnonce?address=${wallet.address}`
  );
  console.log("Nonce", nonce);
  const signature = await wallet.signMessage(
    `Sign into Showtime with this wallet. ${nonce}`
  );
  ``;
  console.log("Signature", signature);
  const {
    data: { access: accessToken },
  } = await axios.post(
    "https://testingservice-dot-showtimenft.wl.r.appspot.com/api/v1/login_wallet",
    {
      address: wallet.address,
      signature,
    }
  );
  console.log("Access token", accessToken);

  return accessToken;
};

async function delay(ms) {
  return await new Promise((resolve) => setTimeout(resolve, ms));
}

const createEdition = async () => {
  const targetInterface = new ethers.utils.Interface(editionCreatorABI);
  const callData = targetInterface.encodeFunctionData("createEdition", [
    "test 1234",
    "TEST",
    "A drop of test",
    "", // animationUrl
    "0x0000000000000000000000000000000000000000000000000000000000000000", // animationHash
    "ipfs://QmNSh7w75EPALBQC57tZiMggy7atTxD3sgmfmEtsi2CjCG", // imageUrl
    "0x5a10c03724f18ec2534436cc5f5d4e9d60a91c2c6cea3ad7e623eb3d54e20ea9", // imageHash
    100, // editionSize
    1000, // royaltyBPS
    onePerAddressMinterContract,
  ]);
  const accessToken = await getAccessToken();
  console.log("Wrapping request...");
  const { data: res } = await axios(
    `https://testingservice-dot-showtimenft.wl.r.appspot.com/api/v1/relayer/forward-request?call_data=${encodeURIComponent(
      callData
    )}&to_address=${encodeURIComponent(metaSingleEditionMintableCreator)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  console.log("Signing...");
  const signature = await wallet._signTypedData(
    res.domain,
    res.types,
    res.value
  );
  console.log("Signature", signature);
  console.log("Submitting tx...");
  const { data: relayedTx } = await axios.post(
    "https://testingservice-dot-showtimenft.wl.r.appspot.com/api/v1/relayer/forward-request",
    {
      forward_request: res,
      signature,
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  let intervalMs = 1000;
  for (let attempts = 0; attempts < 20; attempts++) {
    console.log(`Checking tx... (${attempts + 1} / 20)`);
    const {
      data: { status, relayed_transaction_id: relayedTransactionId, edition },
    } = await axios.get(
      `https://testingservice-dot-showtimenft.wl.r.appspot.com/api/v1/creator-airdrops/poll-edition?relayed_transaction_id=${relayedTx.relayed_transaction_id}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (edition) {
      console.log(edition);
      break;
    } else {
      console.log({ status, relayedTransactionId });
    }

    await delay(intervalMs);
  }
};

createEdition().catch((err) => console.log(err));