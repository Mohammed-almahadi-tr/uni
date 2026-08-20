Imports System.Data.SqlClient

Public Class frmAssetsValue

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Me.Close()
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim D As String = "12/31/" & (Me.DateTimePicker1.Value.Year - 1)

            Dim dap As New SqlDataAdapter("Select " & Me.DateTimePicker1.Value.Year.ToString & " StockPrice,AccountID CustID" & _
                        ",SubAcc CustName,dbo.GetAssetValue(AccountID,N'" & Me.DateTimePicker1.Value.ToShortDateString & _
                        " 23:59:59') MahfIn,dbo.GetDestValue(AccountID,N'" & D & _
                        " 23:59:59') MahfValueIn, dbo.GetDestValueYear(AccountID," & Me.DateTimePicker1.Value.Year.ToString & _
                        ") MahfOut " & _
                        "From Acc Transactions Where Pack= N'الأصول الثابتة' and Acc=N'الأصول' and SubAcc Is Not Null", cnn)

            Dim das As New DataSet

            cnn.Open()

            dap.Fill(das, "Transactions")
            cnn.Close()

            Dim rpt As New AssetsValue
            rpt.SetDataSource(das)
            RptViewer.CrystalReportViewer2.ReportSource = rpt
            RptViewer.CrystalReportViewer2.RefreshReport()
            RptViewer.ShowDialog()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            MsgBox(ex.ToString)
            Try
                cnn.Close()
            Catch

            End Try
        End Try
    End Sub
End Class