An abstract table, with the ability to read/write objects stored under keys.

一个抽象表，具有读/写存储在键下的对象的能力。

The name of this table in the database.

此表在数据库中的名称。

Delete a key from the table.

从表中删除一个键。

List all the keys currently stored in the table.

列出当前存储在表中的所有键。

Read a key from a table, either as an Object or with a given type.

从表中读取作为 Object 或具有给定类型的键。

Write a new value for a key to the table, overwriting any previous value.

将键的新值写入表，覆盖任何以前的值。

An abstract database, consisting of multiple named `Table`s.

一个抽象数据库，由多个命名 `Table` 组成。

Delete an entire `Table` from the database, by name.

按名称从数据库中删除整个 `Table`。

List all `Table`s by name.

按名称列出所有 `Table`。

Open a `Table`.

打开一个 `Table`。

An error returned in rejected promises if the given key is not found in the table.

如果在表中找不到给定键，则在被拒绝的 promise 中返回错误。