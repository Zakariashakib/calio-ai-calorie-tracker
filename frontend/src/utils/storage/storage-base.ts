export type StorageItemKey = string;

export type StorageItemValue =
  | string
  | number
  | boolean
  | null;

export type AssertNoExtras<
  T extends never,
> = T;

export abstract class StorageBase {
  protected warn(
    operation: string,
    key: StorageItemKey,
    error: unknown,
  ) {
    console.warn(
      `[storage] ${operation}(${key}) failed`,
      error,
    );
  }

  protected retrieve<
    Fallback extends StorageItemValue,
  >(
    raw: string | null,
    fallback: Fallback,
  ): Fallback | null {
    if (raw === null) {
      return fallback;
    }

    try {
      return JSON.parse(raw) as Fallback;
    } catch (error) {
      this.warn(
        "retrieve",
        "parse error",
        error,
      );

      return fallback;
    }
  }

  abstract getItem<
    Fallback extends StorageItemValue,
  >(
    key: string,
    fallback: Fallback,
  ): Promise<Fallback | null>;

  abstract setItem<
    Value extends StorageItemValue,
  >(
    key: string,
    value: Value,
  ): Promise<boolean>;

  abstract removeItem(
    key: string,
  ): Promise<boolean>;

  abstract secureGet<
    Fallback extends StorageItemValue,
  >(
    key: string,
    fallback: Fallback,
  ): Promise<Fallback | null>;

  abstract secureSet<
    Value extends StorageItemValue,
  >(
    key: string,
    value: Value,
  ): Promise<boolean>;

  abstract secureRemove(
    key: string,
  ): Promise<boolean>;
}
