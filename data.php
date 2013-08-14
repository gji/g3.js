<?php
if(isset($_GET["index"])) {
	$index = $_GET["index"];
	$sth = $sql->query("SELECT * FROM temperature WHERE `index` > $index");
} else if(isset($_GET["st"])) {
	$st = $_GET["st"];
	$sth = $sql->query("SELECT * FROM temperature WHERE `time` > '$st'");
} else if(isset($_GET["last"])) {
	$lim = $_GET["last"];
	$sth = $sql->query("SELECT * FROM (SELECT * FROM temperature ORDER BY `index` DESC LIMIT $lim) AS T ORDER BY `index`");
} else {
	$sth = $sql->query("SELECT * FROM temperature");
}

$rows = array();
while($r = $sth->fetch_assoc()) {
	$r['index'] = intval($r['index']);
	$r['rand'] = floatval($r['rand']);
    $rows[] = $r;
}
print json_encode($rows);

$sql->close();
?>
