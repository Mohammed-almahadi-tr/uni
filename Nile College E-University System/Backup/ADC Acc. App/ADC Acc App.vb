Imports System.Data.SqlClient

Module Viking_Energy

    Public cnn, cnn1, cnn2, con As New SqlConnection("data source=(local);initial catalog=ADCAcc;integrated security=SSPI")
    'Public cnn, cnn1, cnn2, con As New SqlConnection("data source=PC1\SQLExpress;initial catalog=ADCAcc;user id=sa;password=flatron")

    Public cnnSecurity As New SqlConnection("data source=(local);initial catalog=ADC;integrated security=SSPI")
    'Public cnnSecurity As New SqlConnection("data source=PC1\SQLExpress;initial catalog=ADC;user id=sa;password=flatron")

    Public Employee, CurrentUser, CurrentUserID As String
    Public Priv As String
    Public PWD As String
    Public G_OK As Boolean

    Public RptViewer As New ReportViewer
    Public Mainfrm As New frmMain
End Module
