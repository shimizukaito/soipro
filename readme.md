# getPosts リファレンス

## 概要
`getPosts` は、これまでに保存された **投稿（テキスト・コード・実行結果）** を取得するための関数です。  
主に、過去のログを参照したり、特定の番号（order）に対応する実行結果だけを取り出したりする用途を想定しています。

この関数は、コード評価環境（実行ブロック内）から利用できます。

## 基本的な使い方
```js
const posts = await getPosts();
```
現在選択されているテーマに属する投稿を
直近10件 取得します。

## 関数定義

```js
getPosts(options)
```

options は省略可能です

非同期関数のため await を付けて呼び出します

## 引数（options）
options はオブジェクトで指定します。

名前	型	説明
- limit	    number	取得する投稿の件数
- theme	    number	テーマID
- output	number	特定の番号（order）に対応する出力のみを取得

## オプション詳細

### limit

```js
await getPosts({ limit: 5 });
```

取得する投稿の件数を指定します

省略した場合は 10件 が取得されます

### theme

```js
await getPosts({ theme: 2 });
```

投稿を取得するテーマを指定します
省略した場合は、現在選択中のテーマが使用されます

### output（特定番号の出力を取得）

```js
await getPosts({ output: 18 });
```

output に指定した数値は、投稿の番号（order） として扱われます

指定した番号に対応する投稿から、実行結果（output）だけを取得します

例：
「18番の問題で出力された結果だけを参照したい」

## 返り値
getPosts は Promise を返します。
指定したオプションによって、返り値の形式が変わります。

### output を指定しない場合
```js
const posts = await getPosts();
```

返り値
投稿オブジェクトの配列

```js
[
  {
    id: 12,
    content: "コードやテキスト",
    output: "実行結果",
    order: 3,
    theme: 1,
    user: "pro助",
    createdAt: "2025-12-05T08:40:03.392Z",
    isLatest: false
  },
  ...
]
```

### 各フィールドの意味
フィールド	説明
id	投稿ID
content	投稿内容（テキストまたはコード）
output	実行結果
order	投稿番号
theme	テーマID
user	投稿者
createdAt	作成日時
isLatest	最新かどうか（履歴取得時は false）

## output を指定した場合

```js
const outs = await getPosts({ output: 5 });
```

返り値
出力のみを含む配列

```js
[
  { output: "実行結果その1" },
  { output: "実行結果その2" }
]
```

同じ番号（order）で複数回実行されている場合、複数件返ります

使用例
直近3件の投稿を取得する

```js
const posts = await getPosts({ limit: 3 });
print(posts);
```
特定番号の出力だけを表示する

```js
const outs = await getPosts({ output: 7 });
print(outs.map(o => o.output).join("\n"));
```

```js
const posts = await getPosts({ limit: 5 });
posts.forEach(p => {
  print(`order=${p.order}`);
  print(p.output);
});
```

## 注意点・仕様
getPosts が取得するのは 過去の履歴データ です

最新状態のみを取得する関数ではありません

output オプションは
「出力内容」を指定するものではなく、投稿番号（order）を指定するためのものです

指定した番号が存在しない場合、空の配列が返ります

返り値は常に配列です（1件のみでも配列）


# 関連関数（参考）
* post(theme)
    指定したテーマに属するすべての投稿を取得します

* toCSV(post)
    投稿1件をCSV形式に変換します

* postsToCSV(posts)
    投稿配列をCSV形式に変換します