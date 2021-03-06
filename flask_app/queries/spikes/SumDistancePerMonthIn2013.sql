SELECT MONTH(TO_DATE(TRIP.PICKUP_TIME)) as Monat, SUM(TRIP.DISTANCE) as Entfernung
FROM NYCCAB.TRIP_DOUBLE AS TRIP
WHERE PICKUP_TIME BETWEEN '2012-1-1' AND '2012-12-31'
GROUP BY MONTH(TO_DATE(TRIP.PICKUP_TIME))
ORDER BY Monat