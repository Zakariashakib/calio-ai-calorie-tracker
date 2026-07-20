import AsyncStorage from
  "@react-native-async-storage/async-storage";
import * as SecureStore from
  "expo-secure-store";

import {
  AssertNoExtras,
  StorageBase,
  StorageItemValue,
} from "./storage-base";

export class Storage extends StorageBase {
  async getItem<
    Fallback extends StorageItemValue,
  >(
    key: string,
    fallback: Fallback,
  ): Promise<Fallback | null> {
    try {
      const raw =
        await AsyncStorage.getItem(key);

      return this.retrieve(
        raw,
        fallback,
      );
    } catch (error) {
      this.warn(
        "getItem",
        key,
        error,
      );

      return fallback;
    }
  }

  async setItem<
    Value extends StorageItemValue,
  >(
    key: string,
    value: Value,
  ): Promise<boolean> {
    try {
      await AsyncStorage.setItem(
        key,
        JSON.stringify(value),
      );

      return true;
    } catch (error) {
      this.warn(
        "setItem",
        key,
        error,
      );

      return false;
    }
  }

  async removeItem(
    key: string,
  ): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      this.warn(
        "removeItem",
        key,
        error,
      );

      return false;
    }
  }

  async secureGet<
    Fallback extends StorageItemValue,
  >(
    key: string,
    fallback: Fallback,
  ): Promise<Fallback | null> {
    try {
      const raw =
        await SecureStore
          .getItemAsync(key);

      return this.retrieve(
        raw,
        fallback,
      );
    } catch (error) {
      this.warn(
        "secureGet",
        key,
        error,
      );

      return fallback;
    }
  }

  async secureSet<
    Value extends StorageItemValue,
  >(
    key: string,
    value: Value,
  ): Promise<boolean> {
    try {
      await SecureStore.setItemAsync(
        key,
        JSON.stringify(value),
      );

      return true;
    } catch (error) {
      this.warn(
        "secureSet",
        key,
        error,
      );

      return false;
    }
  }

  async secureRemove(
    key: string,
  ): Promise<boolean> {
    try {
      await SecureStore
        .deleteItemAsync(key);

      return true;
    } catch (error) {
      this.warn(
        "secureRemove",
        key,
        error,
      );

      return false;
    }
  }
}

export const storage = new Storage();

// Compile-time assertion.
type _NoExtras =
  AssertNoExtras<
    Exclude<
      keyof Storage,
      keyof StorageBase
    >
  >;
