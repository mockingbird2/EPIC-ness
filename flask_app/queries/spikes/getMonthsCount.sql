SELECT
	MONTH(PICKUP_TIME), COUNT(*)
FROM
	NYCCAB.FARE
WHERE
	YEAR(PICKUP_TIME) in ?
GROUP BY
	MONTH(PICKUP_TIME)