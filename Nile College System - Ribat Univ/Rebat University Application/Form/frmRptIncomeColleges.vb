Imports System.Data.SqlClient

Public Class frmRptIncomeColleges

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.Close()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim dap As New SqlDataAdapter("Select Distinct N'" & Me.DateTimePicker1.Value.ToString & "' Descr,N'" & _
                     Me.DateTimePicker2.Value.ToString & "' AcdYear,College,dbo.GetBalance(College,N'الإيرادات',N'" & _
                     Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01',N'" & Me.DateTimePicker2.Value.ToShortDateString & _
                     " 23:59:59') TotalValueIn From Colleges Transactions Where College Is Not Null and College<>N''", cnn)
            Dim das As New DataSet
            das.Clear()

            cnn.Open()
            dap.Fill(das, "Transactions")
            cnn.Close()

            Dim rpt As New IncomeColleges
            rpt.SetDataSource(das)
            RptViewer.CrystalReportViewer1.ReportSource = rpt
            RptViewer.CrystalReportViewer1.RefreshReport()
            RptViewer.CrystalReportViewer1.Zoom(60)
            RptViewer.ShowDialog()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub
End Class