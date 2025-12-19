# getPosts リファレンス

## 概要
`getPosts` は、これまでに保存された **投稿（テキスト・コード・実行結果）** を取得するための関数です。  
主に、過去のログを参照したり、特定の番号（order）のブロックだけを取り出したりする用途を想定しています。

この関数は、コードブロック内から利用できます。

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
- order number オーダー番号

テーマIDはユーザー名の横に書いてある番号です。
オーダー番号はブロックの左隣に書いてある添字番号です。


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

投稿を取得するテーマIDを指定します
（テーマIDはユーザー名の隣に書いてあります）
省略した場合は、現在選択中のテーマが使用されます

### order

```js
await getPosts({ order: 3 });
```

投稿を取得するオーダー番号を指定します
（オーダー番号はブロックの左にある添字番号です）


## 返り値
getPosts は Promise を返します。
指定したオプションによって、返り値の形式が変わります。

直近の1件を取得する場合
### 
```js
const posts = await getPosts(1);
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
isLatest	最新かどうか


使用例
直近3件の投稿を取得する

```js
const posts = await getPosts({ limit: 3 });
print(posts);
```


特定番号の出力だけを表示する

```js
const posts = await getPosts({order : 1});
print(posts[0].content);
```

## 注意点・仕様
getPosts が取得するのは 過去の履歴データです。

最新状態のみを取得する関数ではありません

返り値は常に配列です（1件のみでも配列）


# 関連関数（参考）
* post(theme)      指定したテーマに属するすべての投稿を取得します

* toCSV(post)       投稿1件をCSV形式に変換します

* postsToCSV(posts)   投稿配列をCSV形式に変換します