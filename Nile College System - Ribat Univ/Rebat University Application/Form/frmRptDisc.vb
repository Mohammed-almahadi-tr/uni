Imports System.Data.SqlClient
Public Class frmRptDisc

    Sub FillAcdYear()
        Try
            Me.Cursor = Cursors.WaitCursor
            Me.CombAcdYear.Items.Clear()
            Dim cmd As New SqlCommand("select Distinct AcdYear From AcdYear", cnn)
            Dim rdr As SqlDataReader

            cnn.Open()
            rdr = cmd.ExecuteReader
            While rdr.Read
                Me.CombAcdYear.Items.Add(rdr.Item(0))
            End While
            cnn.Close()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.Message)
        End Try
    End Sub

    Sub FillColleges()
        Try
            Me.CombCollege.Items.Clear()
            Dim CollegeList As New ArrayList
            CollegeList = GetCollegesList()

            For Each CollegeName As String In CollegeList
                Me.CombCollege.Items.Add(CollegeName)
            Next
        Catch ex As Exception
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub frmRptDisc_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        FillAcdYear()
        FillColleges()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim dap As New SqlDataAdapter("SELECT [StudName],[College],[Batch],[AcdYear] ,[TuitionFees] " & _
                                          ",[payPerc],[MainFees] ,[discount],[DiscDescr] FROM [RebatUniv].[dbo].[viewDiscount]" & _
                                           "where College=N'" & Me.CombCollege.SelectedItem & "' and AcdYear=N'" & _
                                          Me.CombAcdYear.SelectedItem & "' Order by payPerc Desc", cnn)
            Dim das As New DataSet
            das.Clear()

            cnn.Open()

            dap.Fill(das, "viewDiscount")
            cnn.Close()

            Dim rpt As New rptDiscount
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

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.Close()
    End Sub
End Class