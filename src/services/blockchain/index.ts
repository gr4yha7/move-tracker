import { BlockchainType } from "../../types/blockchain";
import { IBlockchainService } from "./IBlockchainService";
import AptosService from "./aptos/AptosService";
import SuiService from "./sui/SuiService";
import MovementService from "./movement/MovementService";

export class BlockchainServiceFactory {
  public static getService(blockchain: BlockchainType): IBlockchainService {
    switch (blockchain) {
    case BlockchainType.APTOS:
      return AptosService;
    case BlockchainType.SUI:
      return SuiService;
    case BlockchainType.MOVEMENT:
      return MovementService;
    default:
      throw new Error(`Blockchain service not implemented for ${blockchain}`);
    }
  }
}

export { IBlockchainService };
