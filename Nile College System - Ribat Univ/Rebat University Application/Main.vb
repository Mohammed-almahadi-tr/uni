Imports System.Data.SqlClient
Imports System.Net

Module Main
    'Public strConn As String = "data source=(local);initial catalog=RebatUniv;integrated security=SSPI"
    Public strConn As String = "data source=(local);initial catalog=RebatUniv;integrated security=SSPI"
    'Public strConn As String = "data source=m-elhussein\SQLExpress;initial catalog=RebatUniv;user id=sa;password=flatron"
    'Public strConn As String = "data source=172.16.3.254;initial catalog=RebatUniv;user id=sa;password=flatron"

    Public fMain As New frmMain

    Public cnn, cnn1, cnn2, con, con1 As New SqlConnection(strConn)
    Public RptViewer As New ReportViewer
    Public CurrentUser, PWD, Priv, SNLetter As String
    Public SelStudID, SelStudName As String
End Module
