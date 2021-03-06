SELECT
	YEAR(TO_DATE(PICKUP_TIME)), AVG(TOTAL)
FROM
	NYCCAB.FARE
WHERE
	PICKUP_TIME BETWEEN TO_DATE('2010-01-01', 'YYYY-MM-DD') AND TO_DATE('2013-12-31', 'YYYY-MM-DD')
GROUP BY
	YEAR(TO_DATE(PICKUP_TIME))
